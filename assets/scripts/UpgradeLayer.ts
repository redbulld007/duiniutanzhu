import { Color, Graphics, Label, LabelOutline, Node, UITransform } from 'cc';

export type UpgradeKind = 'bounce' | 'combo' | 'split' | 'all';

type Card = { kind: UpgradeKind; node: Node; x: number; y: number; width: number; height: number };

/** Small, self-contained level-clear choice panel. It intentionally uses original copy and code-drawn UI. */
export class UpgradeLayer {
  readonly node = new Node('LevelUpgradeLayer');
  private shade!: Graphics;
  private title!: Label;
  private hint!: Label;
  private cards: Card[] = [];
  private width = 0;
  private height = 0;

  constructor(parent: Node, private readonly onChoose: (kind: UpgradeKind) => void) {
    this.node.parent = parent;
    this.shade = this.node.addComponent(Graphics);
    this.title = this.label('UpgradeTitle', 42, new Color(255, 245, 204)); this.title.node.parent = this.node; this.title.string = '牧场强化三选一';
    this.hint = this.label('UpgradeHint', 22, new Color(255, 244, 211)); this.hint.node.parent = this.node; this.hint.string = '选一个强化继续闯关，或看视频全部领取';
    this.addCard('bounce', '弹力增幅', '反弹更高更久', new Color(255, 146, 72));
    this.addCard('combo', '连击加成', '每次撞钉 +1 分', new Color(80, 188, 236));
    this.addCard('split', '分裂核心', '更快触发分裂球', new Color(167, 112, 235));
    this.addCard('all', '视频全拿', '三种强化全部领取', new Color(97, 203, 97));
    this.node.active = false;
  }

  get visible() { return this.node.active; }
  show() { this.node.active = true; }
  hide() { this.node.active = false; }

  resize(width: number, height: number) {
    this.width = width; this.height = height;
    this.node.setPosition(0, 0); this.node.getComponent(UITransform)?.setContentSize(width, height);
    this.shade.clear(); this.shade.fillColor = new Color(18, 39, 54, 188); this.shade.rect(0, 0, width, height); this.shade.fill();
    this.title.node.setPosition(width / 2, height * .70); this.hint.node.setPosition(width / 2, height * .655);
    const cardW = Math.min(width * .76, 530), cardH = Math.max(82, height * .085);
    this.layoutCard('bounce', width / 2, height * .55, cardW, cardH);
    this.layoutCard('combo', width / 2, height * .445, cardW, cardH);
    this.layoutCard('split', width / 2, height * .34, cardW, cardH);
    this.layoutCard('all', width / 2, height * .205, cardW, cardH * .92);
  }

  handleTap(x: number, y: number) {
    if (!this.node.active) return false;
    const hit = this.cards.find((card) => Math.abs(x - card.x) <= card.width / 2 && Math.abs(y - card.y) <= card.height / 2);
    if (hit) this.onChoose(hit.kind);
    return true;
  }

  private addCard(kind: UpgradeKind, title: string, subtitle: string, color: Color) {
    const node = new Node(`Upgrade_${kind}`); node.parent = this.node; node.addComponent(UITransform);
    const g = node.addComponent(Graphics);
    const titleLabel = this.label(`${kind}_title`, kind === 'all' ? 32 : 30, new Color(255, 255, 255)); titleLabel.node.parent = node; titleLabel.string = title;
    const subLabel = this.label(`${kind}_sub`, 18, new Color(255, 247, 220)); subLabel.node.parent = node; subLabel.string = subtitle;
    (node as Node & { g?: Graphics; color?: Color; title?: Label; sub?: Label }).g = g;
    (node as Node & { g?: Graphics; color?: Color; title?: Label; sub?: Label }).color = color;
    (node as Node & { g?: Graphics; color?: Color; title?: Label; sub?: Label }).title = titleLabel;
    (node as Node & { g?: Graphics; color?: Color; title?: Label; sub?: Label }).sub = subLabel;
    this.cards.push({ kind, node, x: 0, y: 0, width: 0, height: 0 });
  }

  private layoutCard(kind: UpgradeKind, x: number, y: number, width: number, height: number) {
    const card = this.cards.find((item) => item.kind === kind)!;
    const node = card.node as Node & { g?: Graphics; color?: Color; title?: Label; sub?: Label };
    card.x = x; card.y = y; card.width = width; card.height = height; card.node.setPosition(x, y); card.node.getComponent(UITransform)!.setContentSize(width, height);
    const g = node.g!; g.clear(); g.fillColor = new Color(37, 40, 58, 180); g.roundRect(-width / 2 + 3, -height / 2 - 5, width, height, 24); g.fill();
    g.fillColor = node.color!; g.roundRect(-width / 2, -height / 2, width, height, 24); g.fill();
    g.fillColor = new Color(255, 255, 255, 48); g.roundRect(-width / 2 + 5, 3, width - 10, height / 2 - 7, 20); g.fill();
    node.title!.node.setPosition(0, 12); node.sub!.node.setPosition(0, -20);
  }

  private label(name: string, size: number, color: Color) {
    const node = new Node(name); node.addComponent(UITransform).setContentSize(760, 64);
    const label = node.addComponent(Label); label.fontSize = size; label.lineHeight = size + 8; label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
    const outline = node.addComponent(LabelOutline); outline.width = Math.max(2, Math.round(size * .09)); outline.color = new Color(77, 58, 38, 220);
    return label;
  }
}
