import { Color, Graphics, Label, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

export type LobbyAction = 'start' | 'daily' | 'supply' | 'notice' | 'guide' | 'invite' | 'desktop';
type LobbyButton = { id: LobbyAction; node: Node; graphics: Graphics; title: Label; subtitle: Label; width: number; height: number; x: number; y: number };

/** Original home screen for the mobile-game loop. Platform actions are supplied by the game script. */
export class LobbyLayer {
  readonly node = new Node('CowRanchLobby');
  private background!: Sprite;
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
    this.title = this.label('Title', 52, new Color(255, 246, 208)); this.title.string = '对牛弹珠';
    this.status = this.label('Status', 18, new Color(97, 68, 38));
    this.addButton('start', '开始闯关', '发射弹珠，撞铃得分', new Color(235, 137, 45));
    this.addButton('daily', '每日补给', '每天领取牛币', new Color(83, 170, 218));
    this.addButton('supply', '免费补给', '看广告得奖励', new Color(255, 160, 72));
    this.addButton('notice', '牧场公告', '查看本周消息', new Color(114, 159, 113));
    this.addButton('guide', '玩法说明', '特殊钉子与弹珠', new Color(128, 121, 208));
    this.addButton('invite', '邀请好友', '分享牧场乐趣', new Color(225, 110, 143));
    this.addButton('desktop', '添加到桌面', '下次一键开玩', new Color(80, 151, 178));
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
    this.title.node.setPosition(width / 2, height * .82); this.status.node.setPosition(width / 2, height * .76);
    // The mascot owns the lower-right area; keep every interactive control on the left.
    const wide = Math.min(width * .46, 330), small = Math.min(width * .24, 172), h = Math.max(56, height * .063);
    this.layoutButton('start', width * .33, height * .52, wide, h * 1.15);
    this.layoutButton('daily', width * .19, height * .425, small, h);
    this.layoutButton('supply', width * .47, height * .425, small, h);
    this.layoutButton('notice', width * .19, height * .345, small, h);
    this.layoutButton('guide', width * .47, height * .345, small, h);
    this.layoutButton('invite', width * .19, height * .265, small, h);
    this.layoutButton('desktop', width * .47, height * .265, small, h);
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
    const titleLabel = this.label(`${id}_title`, 24, new Color(255, 255, 255)); titleLabel.node.parent = node;
    const subLabel = this.label(`${id}_subtitle`, 13, new Color(255, 247, 220)); subLabel.node.parent = node;
    titleLabel.string = title; subLabel.string = subtitle;
    titleLabel.node.setPosition(0, 9); subLabel.node.setPosition(0, -15);
    (node as Node & { buttonColor?: Color }).buttonColor = color;
    this.buttons.push({ id, node, graphics, title: titleLabel, subtitle: subLabel, width: 0, height: 0, x: 0, y: 0 });
  }

  private layoutButton(id: LobbyAction, x: number, y: number, width: number, height: number) {
    const button = this.buttons.find((item) => item.id === id)!;
    button.x = x; button.y = y; button.width = width; button.height = height; button.node.setPosition(x, y);
    button.node.getComponent(UITransform)!.setContentSize(width, height);
    const color = (button.node as Node & { buttonColor?: Color }).buttonColor!;
    button.graphics.clear(); button.graphics.fillColor = new Color(50, 49, 34, 95); button.graphics.roundRect(-width / 2 + 2, -height / 2 - 3, width, height, height / 2); button.graphics.fill();
    button.graphics.fillColor = color; button.graphics.roundRect(-width / 2, -height / 2, width, height, height / 2); button.graphics.fill();
    button.graphics.fillColor = new Color(255, 255, 255, 38); button.graphics.roundRect(-width / 2 + 5, 2, width - 10, height / 2 - 7, height / 3); button.graphics.fill();
    button.title.node.setPosition(0, height > 75 ? 13 : 8); button.subtitle.node.setPosition(0, height > 75 ? -18 : -14);
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
    const label = node.addComponent(Label); label.fontSize = size; label.lineHeight = size + 8; label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; return label;
  }
}
