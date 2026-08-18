export type PegType = 'normal' | 'gold' | 'reset' | 'bomb' | 'spring' | 'split' | 'coin' | 'prism';
export type LayoutPeg = { x: number; y: number; type: PegType };
export type LevelLayout = { id: string; target: number; pegs: LayoutPeg[] };

const row = (y: number, count: number, offset = 0): LayoutPeg[] => Array.from({ length: count }, (_, i) => ({ x: (i + 1 + offset) / (count + 1 + offset), y, type: 'normal' }));

/** Normalized coordinates make the same hand-made level work on every phone aspect ratio. */
export const BUILTIN_LAYOUTS: LevelLayout[] = [
  { id: 'meadow-intro', target: 100, pegs: [...row(.84, 6), ...row(.70, 7, .5), { x:.27,y:.61,type:'gold' }, {x:.73,y:.61,type:'spring'}, ...row(.54,6), {x:.50,y:.45,type:'reset'}, {x:.32,y:.35,type:'split'}, {x:.68,y:.35,type:'bomb'}, ...row(.22,5)] },
  { id: 'bell-garden', target: 130, pegs: [...row(.85, 7), {x:.18,y:.76,type:'coin'}, ...row(.72,6,.5), {x:.52,y:.65,type:'prism'}, ...row(.57,8), {x:.24,y:.48,type:'spring'}, {x:.76,y:.48,type:'split'}, ...row(.39,6), {x:.50,y:.29,type:'bomb'}, {x:.5,y:.18,type:'reset'}] },
  { id: 'harvest-maze', target: 160, pegs: [...row(.86,8), ...row(.74,7,.5), {x:.25,y:.66,type:'gold'}, {x:.75,y:.66,type:'gold'}, ...row(.58,7), {x:.5,y:.51,type:'prism'}, ...row(.43,6,.5), {x:.2,y:.35,type:'coin'}, {x:.8,y:.35,type:'coin'}, {x:.36,y:.26,type:'bomb'}, {x:.64,y:.26,type:'spring'}, {x:.5,y:.16,type:'reset'}] },
];

export const CUSTOM_LAYOUT_KEY = 'cow-marble-custom-layout';
export function loadCustomLayout(): LevelLayout | undefined { try { const value = JSON.parse(localStorage.getItem(CUSTOM_LAYOUT_KEY) || ''); return value?.pegs?.length ? value as LevelLayout : undefined; } catch { return undefined; } }
export function saveCustomLayout(layout: LevelLayout) { localStorage.setItem(CUSTOM_LAYOUT_KEY, JSON.stringify(layout)); }
