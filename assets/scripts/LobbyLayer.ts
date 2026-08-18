import { Color, Graphics, Label, LabelOutline, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

export type LobbyAction = 'start' | 'daily' | 'supply' | 'notice' | 'guide' | 'invite' | 'desktop' | 'settings';
type LobbyButton = { id: LobbyAction; node: Node; graphics: Graphics; title: Label; subtitle: Label; art: Sprite; width: number; height: number; x: number; y: number };

/** Original home screen for the mobile-game loop. Platform actions are supplied by the game script. */
export class LobbyLayer {
  readonly node = new Node('CowRanchLobby');
  private background!: Sprite;
  private logo!: Sprite;
  private title!: Label;
  private status!: Label;
  private buttons: LobbyButton[] = [];
  private modal!: Node;
  private modalGraphics!: Graphics;
  private modalTitle!: Label;
  private modalText!: Label;
  private width = 0;
  private height = 0;

  constructor(parent: Node, private readonly onAction: (action: LobbyAction) => void) {
    this.node.parent = parent;
    const backgroundNode = new Node('LobbyBackground'); backgroundNode.parent = this.node;
    backgroundNode.addComponent(UITransform);
    this.background = backgroundNode.addComponent(Sprite); this.background.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load('art/cow-ranch-lobby-v1/spriteFrame', SpriteFrame, (error, frame) => { if (!error && frame && this.background.isValid) this.background.spriteFrame = frame; });
    const logoNode = new Node('CowMarbleLogo'); logoNode.parent = this.node; logoNode.addComponent(UITransform); this.logo = logoNode.addComponent(Sprite); this.logo.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load('art/cow-marble-logo-v1/spriteFrame', SpriteFrame, (error, frame) => { if (!error && frame && this.logo.isValid) this.logo.spriteFrame = frame; });
    this.title = this.label('Title', 52, new Color(255, 246, 208)); this.title.node.active = false;
    this.status = this.label('Status', 27, new Color(93, 62, 29));
    this.addButton('start', '开始闯关', '有限弹珠 · 过关强化', new Color(238, 132, 38));
    this.addButton('daily', '每日补给', '领取牛币', new Color(72, 172, 221));
    this.addButton('supply', '弹珠补给', '看视频领取', new Color(111, 190, 93));
    this.addButton('notice', '牧场公告', '本周活动', new Color(236, 169, 61));
    this.addButton('guide', '玩法图鉴', '钉子与弹珠', new Color(135, 114, 214));
    this.addButton('invite', '邀请好友', '分享牧场', new Color(221, 104, 145));
    this.addButton('desktop', '快捷入口', '添加到桌面', new Color(72, 151, 185));
    this.addButton('settings', '设置', '音乐与音效', new Color(118, 137, 151));
    this.createModal();
  }

  show(status: string) { this.status.string = status; this.node.active = true; }
  hide() { this.node.active = false; this.modal.active = false; }
  get visible() { return this.node.active; }

  resize(width: number, height: number) {
    if (!width || !height) return;
    this.width = width; this.height = height;
    const backgroundTransform = this.background.node.getComponent(UITransform)!;
    backgroundTransform.setContentSize(width, height); this.background.node.setPosition(width / 2, height / 2);
    this.logo.node.setPosition(width / 2, height * .805); const logoWidth = Math.min(width * .82, 640); this.logo.node.getComponent(UITransform)!.setContentSize(logoWidth, logoWidth * .5);
    this.title.node.setPosition(width / 2, height * .82); this.status.node.setPosition(width / 2, height * .70);
    // Clear hierarchy: one dominant play button, then six compact side entrances.
    const mainW = Math.min(width * .62, 470), mainH = Math.max(94, height * .105), smallW = Math.min(width * .30, 220), smallH = Math.max(70, height * .07);
    this.layoutButton('start', width * .50, height * .545, mainW, mainH);
    const icon = Math.max(smallH * 1.25, Math.min(width * .18, 146));
    this.layoutButton('daily', width * .16, height * .61, icon, icon);
    this.layoutButton('supply', width * .84, height * .61, icon, icon);
    this.layoutButton('notice', width * .16, height * .44, icon, icon);
    this.layoutButton('guide', width * .84, height * .44, icon, icon);
    this.layoutButton('invite', width * .18, height * .275, icon, icon);
    this.layoutButton('desktop', width * .80, height * .275, icon, icon);
    this.layoutButton('settings', width * .89, height * .88, Math.max(58, icon * .67), Math.max(58, icon * .67));
    this.layoutModal();
  }

  handleTap(x: number, y: number): boolean {
    if (!this.node.active) return false;
    if (this.modal.active) { this.modal.active = false; return true; }
    const hit = this.buttons.find((button) => Math.abs(x - button.x) <= button.width / 2 && Math.abs(y - button.y) <= button.height / 2);
    if (hit) { this.onAction(hit.id); return true; }
    return true;
  }

  showModal(title: string, text: string) {
    this.modalTitle.string = title; this.modalText.string = text; this.modal.active = true;
  }

  private addButton(id: LobbyAction, title: string, subtitle: string, color: Color) {
    const node = new Node(`Lobby_${id}`); node.parent = this.node; node.addComponent(UITransform);
    const graphics = node.addComponent(Graphics);
    const titleLabel = this.label(`${id}_title`, id === 'start' ? 44 : 28, new Color(255, 255, 255)); titleLabel.node.parent = node;
    const subLabel = this.label(`${id}_subtitle`, id === 'start' ? 20 : 16, new Color(255, 247, 220)); subLabel.node.parent = node;
    titleLabel.string = title; subLabel.string = subtitle;
    titleLabel.node.setPosition(0, 12); subLabel.node.setPosition(0, -18);
    const artNode = new Node(`${id}_art`); artNode.parent = node; artNode.addComponent(UITransform); const art = artNode.addComponent(Sprite); art.sizeMode = Sprite.SizeMode.CUSTOM;
    if (id !== 'start') {
      resources.load(`art/lobby-icon-${id}-v1/spriteFrame`, SpriteFrame, (error, frame) => { if (!error && frame && art.isValid) art.spriteFrame = frame; });
      titleLabel.node.active = false; subLabel.node.active = false;
    }
    (node as Node & { buttonColor?: Color }).buttonColor = color;
    this.buttons.push({ id, node, graphics, title: titleLabel, subtitle: subLabel, art, width: 0, height: 0, x: 0, y: 0 });
  }

  private layoutButton(id: LobbyAction, x: number, y: number, width: number, height: number) {
    const button = this.buttons.find((item) => item.id === id)!;
    button.x = x; button.y = y; button.width = width; button.height = height; button.node.setPosition(x, y);
    button.node.getComponent(UITransform)!.setContentSize(width, height);
    if (id !== 'start') {
      button.graphics.clear();
      button.art.node.getComponent(UITransform)!.setContentSize(width * 1.18, height * 1.18); button.art.node.setPosition(0, 0);
      return;
    }
    const color = (button.node as Node & { buttonColor?: Color }).buttonColor!;
    button.graphics.clear(); button.graphics.fillColor = new Color(50, 49, 34, 135); button.graphics.roundRect(-width / 2 + 2, -height / 2 - 5, width, height, height / 2); button.graphics.fill();
    button.graphics.fillColor = new Color(255, 244, 194); button.graphics.roundRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, height / 2 + 3); button.graphics.fill();
    button.graphics.fillColor = color; button.graphics.roundRect(-width / 2, -height / 2, width, height, height / 2); button.graphics.fill();
    button.graphics.fillColor = new Color(255, 255, 255, 58); button.graphics.roundRect(-width / 2 + 6, 3, width - 12, height / 2 - 8, height / 3); button.graphics.fill();
    button.title.node.setPosition(0, height > 75 ? 15 : 10); button.subtitle.node.setPosition(0, height > 75 ? -22 : -17);
    button.art.node.getComponent(UITransform)!.setContentSize(width * .9, height * .76); button.art.node.setPosition(0, 0);
  }

  private createModal() {
    this.modal = new Node('LobbyModal'); this.modal.parent = this.node; this.modal.addComponent(UITransform); this.modalGraphics = this.modal.addComponent(Graphics);
    const panel = new Node('ModalPanel'); panel.parent = this.modal; panel.addComponent(UITransform); panel.addComponent(Graphics);
    this.modalTitle = this.label('ModalTitle', 31, new Color(117, 80, 37)); this.modalTitle.node.parent = panel;
    this.modalText = this.label('ModalText', 19, new Color(79, 65, 48)); this.modalText.node.parent = panel;
    const close = this.label('Close', 18, new Color(255, 255, 255)); close.node.parent = panel; close.string = '轻触任意处关闭';
    (panel as Node & { graphics?: Graphics; close?: Label }).graphics = panel.getComponent(Graphics)!; (panel as Node & { graphics?: Graphics; close?: Label }).close = close;
    this.modal.active = false;
  }

  private layoutModal() {
    this.modal.setPosition(0, 0); this.modal.getComponent(UITransform)!.setContentSize(this.width, this.height); this.modalGraphics.clear(); this.modalGraphics.fillColor = new Color(0, 0, 0, 150); this.modalGraphics.rect(0, 0, this.width, this.height); this.modalGraphics.fill();
    const panel = this.modal.children[0]; const panelWidth = Math.min(this.width * .82, 520), panelHeight = Math.min(this.height * .34, 350); panel.setPosition(this.width / 2, this.height / 2); panel.getComponent(UITransform)!.setContentSize(panelWidth, panelHeight);
    const graphics = (panel as Node & { graphics?: Graphics }).graphics!; graphics.clear(); graphics.fillColor = new Color(255, 247, 221); graphics.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 28); graphics.fill();
    this.modalTitle.node.setPosition(0, panelHeight * .27); this.modalText.node.setPosition(0, -4); this.modalText.overflow = Label.Overflow.SHRINK; this.modalText.node.getComponent(UITransform)!.setContentSize(panelWidth * .76, panelHeight * .4);
    const close = (panel as Node & { close?: Label }).close!; close.node.setPosition(0, -panelHeight * .3);
  }

  private label(name: string, size: number, color: Color) {
    const node = new Node(name); node.parent = this.node; node.addComponent(UITransform).setContentSize(760, 72);
    const label = node.addComponent(Label); label.fontSize = size; label.lineHeight = size + 8; label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
    const outline = node.addComponent(LabelOutline); outline.width = Math.max(2, Math.round(size * .08)); outline.color = new Color(76, 48, 29, 190); return label;
  }
}
