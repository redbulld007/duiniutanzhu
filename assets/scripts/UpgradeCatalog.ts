import { Color } from 'cc';

/** Every upgrade has a stable id so it can later be persisted, balanced remotely, or used by a level editor. */
export type UpgradeId =
  | 'bounce' | 'combo' | 'split' | 'giant' | 'speed' | 'extraBall' | 'bombRange' | 'resetBonus'
  | 'lucky' | 'harvest' | 'springStart' | 'twinStart' | 'echo' | 'shield' | 'magnet' | 'rainbow'
  | 'goldenShot' | 'aftershock' | 'milkShield' | 'pinVision';

export type UpgradeDefinition = { id: UpgradeId; title: string; subtitle: string; color: Color };

export const UPGRADE_CATALOG: UpgradeDefinition[] = [
  { id: 'bounce', title: '弹力蹄铁', subtitle: '全体弹珠反弹 +12%', color: new Color(255, 143, 72) },
  { id: 'combo', title: '牛铃连击', subtitle: '每次撞钉额外 +1 分', color: new Color(75, 185, 238) },
  { id: 'split', title: '分裂核心', subtitle: '更快触发分裂弹珠', color: new Color(168, 109, 236) },
  { id: 'giant', title: '巨球饲料', subtitle: '弹珠体积 +3', color: new Color(245, 112, 94) },
  { id: 'speed', title: '疾风牛仔', subtitle: '发射速度 +55', color: new Color(72, 194, 159) },
  { id: 'extraBall', title: '备用草料', subtitle: '本局与基础弹珠各 +1', color: new Color(107, 199, 92) },
  { id: 'bombRange', title: '炸裂草垛', subtitle: '爆炸钉范围扩大', color: new Color(244, 114, 50) },
  { id: 'resetBonus', title: '丰收重置', subtitle: '命中重置钉额外 +12 分', color: new Color(181, 90, 221) },
  { id: 'lucky', title: '四叶苜蓿', subtitle: '25% 概率撞钉双倍得分', color: new Color(84, 201, 96) },
  { id: 'harvest', title: '金铃丰收', subtitle: '过关牛币额外 +15', color: new Color(240, 188, 59) },
  { id: 'springStart', title: '热身弹簧', subtitle: '每局首球必定高弹', color: new Color(255, 111, 180) },
  { id: 'twinStart', title: '双生奶花', subtitle: '每局首球必定分裂', color: new Color(116, 169, 255) },
  { id: 'echo', title: '余音绕梁', subtitle: '每第 4 次撞钉额外回响 +4 分', color: new Color(105, 154, 238) },
  { id: 'shield', title: '牧场护符', subtitle: '本关首次用尽弹珠时返还 1 颗', color: new Color(90, 207, 194) },
  { id: 'magnet', title: '金铃磁场', subtitle: '弹珠轻微吸向未击中钉子', color: new Color(104, 153, 220) },
  { id: 'rainbow', title: '彩虹奶糖', subtitle: '每次撞钉随机额外 +0~3 分', color: new Color(225, 99, 216) },
  { id: 'goldenShot', title: '黄金开局', subtitle: '每局首个钉子额外 +10 分', color: new Color(244, 190, 46) },
  { id: 'aftershock', title: '震荡余波', subtitle: '爆炸钉额外触发更远目标', color: new Color(235, 99, 69) },
  { id: 'milkShield', title: '奶泡护盾', subtitle: '首颗落底弹珠获得一次救回', color: new Color(119, 205, 245) },
  { id: 'pinVision', title: '牧场雷达', subtitle: '特殊钉子额外出现 1 个', color: new Color(152, 128, 225) },
];

export function rollUpgrades(count: number, owned: ReadonlySet<UpgradeId>): UpgradeDefinition[] {
  const pool = UPGRADE_CATALOG.filter((item) => !owned.has(item.id));
  const source = pool.length >= count ? pool : UPGRADE_CATALOG;
  return [...source].sort(() => Math.random() - .5).slice(0, count);
}
