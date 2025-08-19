export type PresetSpec = Record<string, number>

export interface Preset {
  id: string;
  name: string;
  values: PresetSpec;
  isCustom?: boolean;
  isModified?: boolean;
}

export const BUILTIN_PRESETS: Record<string, PresetSpec> = {
  brightest: { '0x10': 100, '0x12': 75 },
  mid: { '0x10': 50, '0x12': 50 },
  midnight: { '0x10': 10, '0x12': 40 },
}

// Convert builtin presets to Preset objects
export const DEFAULT_PRESETS: Preset[] = [
  { id: "brightest", name: "Brightest", values: { '0x10': 100, '0x12': 75 } },
  { id: "mid", name: "Mid", values: { '0x10': 50, '0x12': 50 } },
  { id: "midnight", name: "Midnight", values: { '0x10': 10, '0x12': 40 } },
];

const STORAGE_KEY = 'radiantctl_custom_presets';

export function getPreset(id: string): PresetSpec | undefined {
  return BUILTIN_PRESETS[id]
}

export function loadCustomPresets(): Preset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save custom presets:', error);
  }
}

export function getAllPresets(): Preset[] {
  const customPresets = loadCustomPresets();
  return [...DEFAULT_PRESETS, ...customPresets];
}

export function addCustomPreset(preset: Omit<Preset, 'isCustom'>): void {
  const customPreset: Preset = { ...preset, isCustom: true };
  const existing = loadCustomPresets();
  const updated = [...existing, customPreset];
  saveCustomPresets(updated);
}

export function updatePreset(presetId: string, values: PresetSpec): void {
  const allPresets = getAllPresets();
  const preset = allPresets.find(p => p.id === presetId);
  
  if (!preset) return;
  
  if (preset.isCustom) {
    // Update custom preset
    const customPresets = loadCustomPresets();
    const updated = customPresets.map(p => 
      p.id === presetId ? { ...p, values, isModified: true } : p
    );
    saveCustomPresets(updated);
  } else {
    // Create a custom copy of builtin preset
    const customPreset: Preset = {
      ...preset,
      id: `${presetId}_custom`,
      name: `${preset.name} (Custom)`,
      values,
      isCustom: true,
      isModified: true
    };
    addCustomPreset(customPreset);
  }
}

export function deleteCustomPreset(presetId: string): void {
  const customPresets = loadCustomPresets();
  const updated = customPresets.filter(p => p.id !== presetId);
  saveCustomPresets(updated);
}

export function valuesMatchPreset(values: PresetSpec, preset: Preset): boolean {
  const presetKeys = Object.keys(preset.values);
  const valueKeys = Object.keys(values);
  
  if (presetKeys.length !== valueKeys.length) return false;
  
  return presetKeys.every(key => 
    values[key] === preset.values[key]
  );
}


