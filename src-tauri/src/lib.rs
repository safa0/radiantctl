// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tokio::process::Command;
use tokio::time::{sleep, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub id: String,
    pub display_key: String,
    pub model: Option<String>,
    pub mfg: Option<String>,
    pub serial: Option<String>,
    pub bus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DisplayState {
    pub caps: Option<String>,
    pub values: HashMap<String, u32>,
    pub ready: bool,
    pub last_updated: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub last_selected_display_id: Option<String>,
    pub startup_preset: Option<String>,
    pub presets: Vec<UserPreset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreset {
    pub id: String,
    pub name: String,
    pub scope: PresetScope,
    pub values: HashMap<String, u32>,
    pub monitor_overrides: HashMap<String, HashMap<String, u32>>, // display_id -> code->value
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PresetScope {
    AllMonitors,
    PerMonitor,
}

impl Default for PresetScope {
    fn default() -> Self { PresetScope::AllMonitors }
}

static SETTINGS_DIR: Lazy<PathBuf> = Lazy::new(|| {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("modern-ddcui")
});

static SETTINGS_FILE: Lazy<PathBuf> = Lazy::new(|| SETTINGS_DIR.join("settings.json"));

#[derive(Default)]
struct AppData {
    displays: Vec<DisplayInfo>,
    states: HashMap<String, DisplayState>,
    settings: Settings,
}

type SharedAppData = Arc<Mutex<AppData>>;

static APP_DATA: Lazy<SharedAppData> = Lazy::new(|| Arc::new(Mutex::new(AppData::default())));

async fn run_ddcutil_text(args: &[&str]) -> Result<String> {
    let output = Command::new("ddcutil").args(args).output().await?;
    if !output.status.success() {
        return Err(anyhow!(
            "ddcutil failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn settings_load() -> Settings {
    if let Ok(bytes) = fs::read(&*SETTINGS_FILE) {
        if let Ok(s) = serde_json::from_slice::<Settings>(&bytes) {
            return s;
        }
    }
    Settings::default()
}

fn settings_save(settings: &Settings) -> Result<()> {
    fs::create_dir_all(&*SETTINGS_DIR)?;
    let bytes = serde_json::to_vec_pretty(settings)?;
    fs::write(&*SETTINGS_FILE, bytes)?;
    Ok(())
}

fn parse_detect_text(output: &str) -> Vec<DisplayInfo> {
    let mut displays = Vec::new();
    let mut current: Option<DisplayInfo> = None;
    for line in output.lines() {
        let line = line.trim();
        if let Some(cap) = line.strip_prefix("Display ") {
            // start new display block
            if let Some(d) = current.take() { displays.push(d); }
            let num = cap.split_whitespace().next().unwrap_or("").to_string();
            current = Some(DisplayInfo {
                id: num.clone(),
                display_key: num,
                model: None,
                mfg: None,
                serial: None,
                bus: None,
            });
        } else if let Some(rest) = line.strip_prefix("I2C bus:") {
            if let Some(ref mut d) = current { d.bus = Some(rest.trim().to_string()); }
        } else if let Some(rest) = line.strip_prefix("Model:") {
            if let Some(ref mut d) = current { d.model = Some(rest.trim().to_string()); }
        } else if let Some(rest) = line.strip_prefix("Mfg id:").or_else(|| line.strip_prefix("Vendor:")) {
            if let Some(ref mut d) = current { d.mfg = Some(rest.trim().to_string()); }
        } else if let Some(rest) = line.strip_prefix("Serial number:").or_else(|| line.strip_prefix("Serial:")) {
            if let Some(ref mut d) = current { d.serial = Some(rest.trim().to_string()); }
        }
    }
    if let Some(d) = current.take() { displays.push(d); }
    // ensure ids are stable: combine key+model+serial
    for d in &mut displays {
        d.id = format!(
            "{}:{}:{}",
            d.display_key,
            d.model.clone().unwrap_or_default(),
            d.serial.clone().unwrap_or_default()
        );
    }
    displays
}

async fn prefetch_display_state(display: &DisplayInfo) -> DisplayState {
    let mut state = DisplayState::default();
    // capabilities
    match run_ddcutil_text(&["capabilities", "--display", &display.display_key]).await {
        Ok(text) => {
            // store full text; frontend can parse or just show a snippet later
            state.caps = Some(text);
        }
        Err(e) => state.error = Some(e.to_string()),
    }
    // common VCPs: 0x10, 0x12, 0x16,0x18,0x1A
    let codes = [0x10, 0x12, 0x16, 0x18, 0x1A];
    for code in codes { 
        if let Ok(text) = run_ddcutil_text(&["getvcp", &format!("0x{:02x}", code), "--display", &display.display_key]).await {
            // Parse: look for 'current value = N'
            let mut current: u32 = 0;
            for l in text.lines() {
                if let Some(pos) = l.find("current value =") {
                    let tail = &l[pos + "current value =".len()..];
                    let n = tail.trim().split(|c: char| !c.is_ascii_digit()).next().unwrap_or("");
                    if let Ok(v) = n.parse::<u32>() { current = v; break; }
                }
            }
            state.values.insert(format!("0x{:02x}", code), current);
        }
    }
    state.ready = state.error.is_none();
    state.last_updated = Some(
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
    );
    state
}

async fn discover_and_prefetch(app_handle: tauri::AppHandle) -> Result<()> {
    // detect
    let detect_text = run_ddcutil_text(&["detect"]).await?;
    let displays = parse_detect_text(&detect_text);
    {
        let mut data = APP_DATA.lock().unwrap();
        data.displays = displays.clone();
    }
    // emit displayAdded for each
    for d in &displays {
        app_handle.emit("displayAdded", d).ok();
    }
    // prefetch in parallel
    let mut handles = Vec::new();
    for d in displays.clone() {
        let app = app_handle.clone();
        handles.push(tokio::spawn(async move {
            let state = prefetch_display_state(&d).await;
            app.emit("displayUpdated", (&d, &state)).ok();
            (d.id.clone(), state)
        }));
    }
    let mut new_states = HashMap::new();
    for h in handles { if let Ok((id, st)) = h.await { new_states.insert(id, st); } }
    {
        let mut data = APP_DATA.lock().unwrap();
        data.states.extend(new_states);
    }
    Ok(())
}

#[tauri::command]
async fn list_displays() -> Result<Vec<DisplayInfo>, String> {
    let data = APP_DATA.lock().unwrap();
    Ok(data.displays.clone())
}

#[tauri::command]
async fn get_display_state(id: String) -> Result<DisplayState, String> {
    let data = APP_DATA.lock().unwrap();
    Ok(data.states.get(&id).cloned().unwrap_or_default())
}

#[tauri::command]
async fn set_vcp_value(id: String, code: String, value: u32) -> Result<(), String> {
    let display = {
        let data = APP_DATA.lock().unwrap();
        data.displays
            .iter()
            .find(|d| d.id == id)
            .cloned()
            .ok_or("display not found".to_string())?
    };
    let _ = run_ddcutil_text(&["setvcp", &code, &value.to_string(), "--display", &display.display_key])
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_settings() -> Result<Settings, String> {
    let data = APP_DATA.lock().unwrap();
    Ok(data.settings.clone())
}

#[tauri::command]
async fn save_settings(settings: Settings) -> Result<(), String> {
    settings_save(&settings).map_err(|e| e.to_string())?;
    let mut data = APP_DATA.lock().unwrap();
    data.settings = settings;
    Ok(())
}

#[tauri::command]
async fn apply_preset(target: String, preset_id: String) -> Result<(), String> {
    // Get the display
    let _display = {
        let data = APP_DATA.lock().unwrap();
        data.displays
            .iter()
            .find(|d| d.id == target)
            .cloned()
            .ok_or("display not found".to_string())?
    };

    // Get preset values - this will be handled by the frontend
    // The frontend will call set_vcp_value for each value in the preset
    let mut values: HashMap<String, u32> = HashMap::new();
    
    // Builtin presets
    match preset_id.as_str() {
        "brightest" => { 
            values.insert("0x10".to_string(), 100); 
            values.insert("0x12".to_string(), 75); 
        }
        "mid" => { 
            values.insert("0x10".to_string(), 50); 
            values.insert("0x12".to_string(), 50); 
        }
        "midnight" => { 
            values.insert("0x10".to_string(), 10); 
            values.insert("0x12".to_string(), 40); 
        }
        _ => {
            // For custom presets, the frontend will handle the values
            // This is just a fallback for builtin presets
            return Ok(());
        }
    }

    // Apply values in order
    let order = ["0x10", "0x12", "0x16", "0x18", "0x1A"];
    for c in order {
        if let Some(v) = values.get(c) {
            set_vcp_value(target.clone(), c.to_string(), *v).await?;
        }
    }
    Ok(())
}

async fn permissions_check() -> serde_json::Value {
    let ddcutil = which::which("ddcutil").ok().is_some();
    let have_i2c = std::fs::read_dir("/dev")
        .ok()
        .map(|mut it| {
            it.any(|e| {
                e.ok()
                    .map(|e| e.file_name().to_string_lossy().starts_with("i2c-"))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false);
    let json_supported = if ddcutil {
        match Command::new("ddcutil").arg("--help").output().await {
            Ok(out) => String::from_utf8_lossy(&out.stdout).contains("--json"),
            Err(_) => false,
        }
    } else {
        false
    };
    serde_json::json!({
        "ddcutil": ddcutil,
        "i2c": have_i2c,
        "jsonSupported": json_supported,
    })
}

#[tauri::command]
async fn check_permissions() -> Result<serde_json::Value, String> {
    Ok(permissions_check().await)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = settings_load();
    {
        let mut data = APP_DATA.lock().unwrap();
        data.settings = settings;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = discover_and_prefetch(handle.clone()).await;
                // naive hotplug poller
                loop {
                    sleep(Duration::from_secs(5)).await;
                    let _ = discover_and_prefetch(handle.clone()).await;
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_displays,
            get_display_state,
            apply_preset,
            set_vcp_value,
            get_settings,
            save_settings,
            check_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
