export type PresetSpec = Record<string, number>

export const BUILTIN_PRESETS: Record<string, PresetSpec> = {
  brightest: { '0x10': 100, '0x12': 75 },
  mid: { '0x10': 50, '0x12': 50 },
  midnight: { '0x10': 10, '0x12': 40 },
}

export function getPreset(id: string): PresetSpec | undefined {
  return BUILTIN_PRESETS[id]
}


