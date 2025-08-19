import { describe, it, expect } from 'vitest'
import { BUILTIN_PRESETS, getPreset } from './presets'

describe('presets', () => {
  it('has built-in presets', () => {
    expect(BUILTIN_PRESETS.brightest['0x10']).toBe(100)
    expect(BUILTIN_PRESETS.mid['0x12']).toBe(50)
    expect(BUILTIN_PRESETS.midnight['0x10']).toBe(10)
  })
  it('getPreset returns values', () => {
    expect(getPreset('mid')).toEqual({ '0x10': 50, '0x12': 50 })
    expect(getPreset('nope')).toBeUndefined()
  })
})


