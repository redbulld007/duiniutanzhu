export type HeroId = 'oldOx' | 'grandpaBull' | 'milkCow' | 'calf';
export type HeroDefinition = { id: HeroId; name: string; trait: string; detail: string; art: string };

export const HEROES: HeroDefinition[] = [
  { id: 'oldOx', name: '老黄牛', trait: '巨型弹珠', detail: '弹珠更大，更容易连续撞钉', art: 'hero-old-ox-v1' },
  { id: 'grandpaBull', name: '牛爷爷', trait: '回响弹珠', detail: '每颗弹珠的首次撞钉额外回响得分', art: 'hero-grandpa-bull-v1' },
  { id: 'milkCow', name: '奶牛', trait: '奶花分裂', detail: '每局第一颗弹珠必定分裂', art: 'hero-milk-cow-v1' },
  { id: 'calf', name: '牛犊子', trait: '冲刺弹珠', detail: '发射更快，冲击更有力', art: 'hero-calf-v1' },
];
