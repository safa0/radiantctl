import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getAllPresets, updatePreset, valuesMatchPreset, deleteCustomPreset, addCustomPreset, Preset } from "./lib/presets";
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

function App() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [states, setStates] = useState<Record<string, DisplayState>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [perms, setPerms] = useState<{ ddcutil: boolean; i2c: boolean; jsonSupported?: boolean } | null>(null)
  const [presets, setPresets] = useState<Preset[]>(getAllPresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCreatePreset, setShowCreatePreset] = useState(false);

  const [newPresetName, setNewPresetName] = useState("");
  const [useCurrentValues, setUseCurrentValues] = useState(true);
  
  const selected = useMemo(
    () => displays.find((d) => d.id === selectedId),
    [displays, selectedId]
  );
  const [brightness, setBrightness] = useState<number>(0)
  const [contrast, setContrast] = useState<number>(0)

  // Get current display values
  const currentValues = useMemo(() => {
    if (!selected) return {};
    const st = states[selected.id];
    return st?.values || {};
  }, [selected, states]);

  // Find which preset matches current values
  const matchingPresetId = useMemo(() => {
    return presets.find(preset => valuesMatchPreset(currentValues, preset))?.id || null;
  }, [currentValues, presets]);

  // Get selected preset
  const selectedPreset = useMemo(() => {
    return presets.find(p => p.id === selectedPresetId) || null;
  }, [presets, selectedPresetId]);

  // Check if selected preset values match current values
  const isPresetModified = useMemo(() => {
    if (!selectedPreset || !currentValues) return false;
    return !valuesMatchPreset(currentValues, selectedPreset);
  }, [selectedPreset, currentValues]);

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

  // Update presets when they change
  useEffect(() => {
    setPresets(getAllPresets());
  }, []);

  const refreshPresets = () => {
    setPresets(getAllPresets());
  };

  const applyPreset = async (presetId: string) => {
    if (!selectedId) return;
    
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    
    // Apply each value in the preset
    for (const [code, value] of Object.entries(preset.values)) {
      await invoke("set_vcp_value", { id: selectedId, code, value });
    }
    
    setSelectedPresetId(presetId);
  };

  const setVcp = async (code: string, value: number) => {
    if (!selectedId) return;
    await invoke("set_vcp_value", { id: selectedId, code, value });
    
    // If a preset is selected and values change, update the preset
    if (selectedPresetId) {
      const newValues = { ...currentValues, [code]: value };
      updatePreset(selectedPresetId, newValues);
      refreshPresets(); // Refresh presets after update
    }
  };

  const handlePresetClick = (preset: Preset) => {
    if (selectedPresetId === preset.id) {
      // Deselect if already selected
      setSelectedPresetId(null);
    } else {
      // Select and apply preset
      setSelectedPresetId(preset.id);
      applyPreset(preset.id);
    }
  };

  const handleDeletePreset = (presetId: string) => {
    deleteCustomPreset(presetId);
    refreshPresets();
    if (selectedPresetId === presetId) {
      setSelectedPresetId(null);
    }
    setShowDeleteConfirm(null);
  };

  const isPresetSelected = (presetId: string) => selectedPresetId === presetId;
  const isPresetMatching = (presetId: string) => matchingPresetId === presetId;

  const getPresetStatusMessage = () => {
    if (!selectedPreset) return "No preset selected";
    if (isPresetMatching(selectedPreset.id)) return "✅ Values match preset perfectly";
    if (isPresetModified) return "🔄 Preset modified - changes saved automatically";
    return "📌 Preset selected";
  };

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return;
    
    const values = useCurrentValues ? currentValues : { '0x10': 50, '0x12': 50 };
    const newPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName,
      values: values as Record<string, number>,
      isCustom: true
    };
    
    addCustomPreset(newPreset);
    refreshPresets();
    setNewPresetName("");
    setShowCreatePreset(false);
  };

  const handleRevertPreset = () => {
    if (!selectedPreset) return;
    
    // Apply original preset values
    for (const [code, value] of Object.entries(selectedPreset.values)) {
      invoke("set_vcp_value", { id: selectedId, code, value });
    }

  };

  const handleSaveAsCustom = () => {
    if (!selectedPreset || selectedPreset.isCustom) return;
    
    const customPreset = {
      id: `${selectedPreset.id}_custom_${Date.now()}`,
      name: `${selectedPreset.name} (Custom)`,
      values: currentValues as Record<string, number>,
      isCustom: true,
      isModified: true
    };
    
    addCustomPreset(customPreset);
    refreshPresets();
    setSelectedPresetId(customPreset.id);

  };

  const handleDuplicatePreset = (preset: Preset) => {
    const duplicatedPreset = {
      id: `${preset.id}_copy_${Date.now()}`,
      name: `${preset.name} Copy`,
      values: { ...preset.values },
      isCustom: true
    };
    
    addCustomPreset(duplicatedPreset);
    refreshPresets();
  };

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
              <div className="section-header">
                <h3 className="section-title">Quick Presets</h3>
                <button 
                  className="btn-create-preset"
                  onClick={() => setShowCreatePreset(true)}
                  title="Create new preset"
                >
                  + Create Preset
                </button>
              </div>
              
              {/* Modification Banner */}
              {selectedPreset && isPresetModified && !selectedPreset.isCustom && (
                <div className="preset-modification-banner">
                  <div className="banner-content">
                    <span className="banner-icon">⚠️</span>
                    <span className="banner-text">Modifying built-in preset "{selectedPreset.name}"</span>
                  </div>
                  <div className="banner-actions">
                    <button className="btn-secondary" onClick={handleRevertPreset}>
                      Revert Changes
                    </button>
                    <button className="btn-primary" onClick={handleSaveAsCustom}>
                      Save as Custom
                    </button>
                  </div>
                </div>
              )}
              
              <div className="preset-grid">
                {presets.map((preset) => (
                  <div key={preset.id} className="preset-container">
                    <button 
                      className={`preset-btn ${isPresetSelected(preset.id) ? 'selected' : ''} ${isPresetMatching(preset.id) ? 'matching' : ''} ${isPresetSelected(preset.id) && isPresetModified ? 'modified' : ''}`}
                      onClick={() => handlePresetClick(preset)}
                      title={getPresetStatusMessage()}
                    >
                      <div className="preset-content">
                        <div className="preset-header">
                          <span className="preset-name">{preset.name}</span>
                          {isPresetMatching(preset.id) && (
                            <span className="preset-checkbox">✓</span>
                          )}
                        </div>
                        <div className="preset-values-preview">
                          Brightness: {preset.values['0x10'] || 0}% | Contrast: {preset.values['0x12'] || 0}%
                        </div>
                      </div>
                      {preset.isCustom && (
                        <span className="preset-badge">Custom</span>
                      )}
                    </button>
                    
                    {/* Action buttons for custom presets */}
                    {preset.isCustom && isPresetSelected(preset.id) && (
                      <div className="preset-actions">
                        <button 
                          className="preset-action-btn preset-duplicate-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePreset(preset);
                          }}
                          title="Duplicate preset"
                        >
                          📋
                        </button>
                        <button 
                          className="preset-action-btn preset-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(preset.id);
                          }}
                          title="Delete preset"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    
                    {/* Duplicate button for built-in presets */}
                    {!preset.isCustom && isPresetSelected(preset.id) && (
                      <button 
                        className="preset-action-btn preset-duplicate-btn preset-duplicate-only"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePreset(preset);
                        }}
                        title="Duplicate preset"
                      >
                        📋
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedPreset && (
                <div className="preset-status">
                  <p className="preset-status-text">
                    {getPresetStatusMessage()}
                  </p>
                </div>
              )}
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
        
        {/* Create preset modal */}
        {showCreatePreset && (
          <div className="modal-overlay" onClick={() => setShowCreatePreset(false)}>
            <div className="modal create-preset-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Create New Preset</h3>
              <div className="form-group">
                <label className="form-label">Preset Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Enter preset name..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreatePreset()}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-checkbox-label">
                  <input 
                    type="checkbox"
                    checked={useCurrentValues}
                    onChange={(e) => setUseCurrentValues(e.target.checked)}
                  />
                  Use current monitor values
                </label>
              </div>
              {useCurrentValues ? (
                <div className="current-values-preview">
                  <p>Current values will be saved:</p>
                  <div className="values-grid">
                    <span>Brightness: {brightness}%</span>
                    <span>Contrast: {contrast}%</span>
                  </div>
                </div>
              ) : (
                <div className="preset-values-editor">
                  <div className="form-row">
                    <label>Brightness</label>
                    <input type="range" min="0" max="100" defaultValue="50" />
                    <span>50%</span>
                  </div>
                  <div className="form-row">
                    <label>Contrast</label>
                    <input type="range" min="0" max="100" defaultValue="50" />
                    <span>50%</span>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreatePreset(false);
                    setNewPresetName("");
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleCreatePreset}
                  disabled={!newPresetName.trim()}
                >
                  Create Preset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Preset</h3>
              <p>Are you sure you want to delete this custom preset?</p>
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-danger"
                  onClick={() => handleDeletePreset(showDeleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
