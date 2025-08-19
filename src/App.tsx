import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

type DisplayInfo = {
  id: string;
  display_key: string;
  model?: string;
  mfg?: string;
  serial?: string;
  bus?: string;
};

type DisplayState = {
  caps?: string;
  values: Record<string, number>;
  ready: boolean;
  last_updated?: number;
  error?: string;
};

const Presets: { id: string; name: string; values: Record<string, number> }[] = [
  { id: "brightest", name: "Brightest", values: { "0x10": 100, "0x12": 75 } },
  { id: "mid", name: "Mid", values: { "0x10": 50, "0x12": 50 } },
  { id: "midnight", name: "Midnight", values: { "0x10": 10, "0x12": 40 } },
];

function App() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [states, setStates] = useState<Record<string, DisplayState>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [perms, setPerms] = useState<{ ddcutil: boolean; i2c: boolean; jsonSupported?: boolean } | null>(null)
  const selected = useMemo(
    () => displays.find((d) => d.id === selectedId),
    [displays, selectedId]
  );
  const [brightness, setBrightness] = useState<number>(0)
  const [contrast, setContrast] = useState<number>(0)

  useEffect(() => {
    invoke<any>("check_permissions").then((p) => setPerms(p as any))
    invoke<DisplayInfo[]>("list_displays").then((list) => {
      setDisplays(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
    const unlistenAdded = listen<DisplayInfo>("displayAdded", (e) => {
      setDisplays((prev) => {
        const exists = prev.some((d) => d.id === e.payload.id);
        return exists ? prev : [...prev, e.payload];
      });
      setSelectedId((prev) => prev ?? e.payload.id);
    });
    const unlistenUpdated = listen<[DisplayInfo, DisplayState]>(
      "displayUpdated",
      (e) => {
        const [info, state] = e.payload;
        setStates((prev) => ({ ...prev, [info.id]: state }));
      }
    );
    return () => {
      unlistenAdded.then((f) => f());
      unlistenUpdated.then((f) => f());
    };
  }, []);

  // Sync local slider states when selected monitor or backend states update
  useEffect(() => {
    if (selected) {
      const st = states[selected.id]
      if (st?.values) {
        if (typeof st.values["0x10"] === 'number') setBrightness(st.values["0x10"])
        if (typeof st.values["0x12"] === 'number') setContrast(st.values["0x12"])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, states[selected?.id ?? ""]?.last_updated])

  const applyPreset = async (presetId: string) => {
    if (!selectedId) return;
    await invoke("apply_preset", { target: selectedId, presetId });
  };

  const setVcp = async (code: string, value: number) => {
    if (!selectedId) return;
    await invoke("set_vcp_value", { id: selectedId, code, value });
  };

  // const s = selected ? states[selected.id] : undefined;

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="sidebar-title">Monitors</h2>
        <ul className="monitor-list">
          {displays.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setSelectedId(d.id)}
                className={`monitor-item ${selectedId === d.id ? 'active' : ''}`}
              >
                <div className="monitor-name">{d.model ?? d.display_key}</div>
                <div className="monitor-sub">{d.mfg ?? ''} {d.serial ?? ''}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="main">
        <h1 className="title gradient-text">Radiant Control</h1>
        {perms && (!perms.ddcutil || !perms.i2c || !perms.jsonSupported) && (
          <div className="banner warning">
            <div className="banner-title">Permissions/Dependencies</div>
            <div className="banner-body">
              ddcutil: {String(perms.ddcutil)} | i2c: {String(perms.i2c)} | json: {String(perms.jsonSupported)}
            </div>
            <div className="banner-foot">
              Install ddcutil and enable I2C: sudo apt install ddcutil; sudo modprobe i2c-dev; echo 'i2c-dev' | sudo tee /etc/modules-load.d/i2c-dev.conf; echo 'KERNEL=="i2c-*", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/60-ddcutil.rules; sudo udevadm control --reload-rules && sudo udevadm trigger; sudo usermod -aG i2c $USER; re-login.
            </div>
          </div>
        )}
        {selected ? (
          <>
            <section className="card">
              <h3 className="section-title">Quick Presets</h3>
              <div className="preset-grid">
                {Presets.map((p) => (
                  <button key={p.id} className="preset-btn" onClick={() => applyPreset(p.id)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </section>
            <section className="card">
              <h3 className="section-title">Advanced</h3>
              <div className="form-row">
                <label className="label">Brightness (0x10)</label>
                <input
                  className="slider"
                  type="range"
                  min={0}
                  max={100}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  onPointerUp={() => setVcp('0x10', brightness)}
                  onKeyUp={(e) => { if ((e as any).key === 'Enter') setVcp('0x10', brightness) }}
                  onBlur={() => setVcp('0x10', brightness)}
                />
                <span className="badge">{brightness}</span>
              </div>
              <div className="form-row">
                <label className="label">Contrast (0x12)</label>
                <input
                  className="slider"
                  type="range"
                  min={0}
                  max={100}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  onPointerUp={() => setVcp('0x12', contrast)}
                  onKeyUp={(e) => { if ((e as any).key === 'Enter') setVcp('0x12', contrast) }}
                  onBlur={() => setVcp('0x12', contrast)}
                />
                <span className="badge">{contrast}</span>
              </div>
            </section>
          </>
        ) : (
          <div className="empty">No monitors detected yet.</div>
        )}
      </main>
    </div>
  );
}

export default App;
