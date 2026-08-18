import { Color, Graphics, Label, LabelOutline, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import { HeroDefinition, HeroId, HEROES } from './HeroCatalog';

type HeroCard = { hero: HeroDefinition; node: Node; x: number; y: number; width: number; height: number };

/** Character selection is code-built so new portraits can be added without touching the scene. */
export class HeroSelectionLayer {
  readonly node = new Node('HeroSelectionLayer');
  private shade!: Graphics; private title!: Label; private hint!: Label; private cards: HeroCard[] = [];
  private width = 0; private height = 0;

  constructor(parent: Node, private readonly onChoose: (id: HeroId) => void) {
    this.node.parent = parent; this.shade = this.node.addComponent(Graphics);
    this.title = this.label('HeroTitle', 44, new Color(255, 244, 200)); this.title.node.parent = this.node; this.title.string = '选择你的牧场伙伴';
    this.hint = this.label('HeroHint', 23, new Color(255, 248, 222)); this.hint.node.parent = this.node; this.hint.string = '每位牛伙伴都有专属开局弹珠';
    HEROES.forEach((hero) => this.addCard(hero)); this.node.active = false;
  }
  get visible() { return this.node.active; }
  show() { this.node.active = true; }
  hide() { this.node.active = false; }
  resize(width: number, height: number) {
    this.width = width; this.height = height; this.node.setPosition(0, 0); this.node.getComponent(UITransform)?.setContentSize(width, height);
    this.shade.clear(); this.shade.fillColor = new Color(18, 39, 54, 208); this.shade.rect(0, 0, width, height); this.shade.fill();
    this.title.node.setPosition(width / 2, height * .84); this.hint.node.setPosition(width / 2, height * .79);
    const cardW = Math.min(width * .42, 310), cardH = Math.min(height * .265, 250);
    this.cards.forEach((card, index) => this.layoutCard(card, index % 2 ? width * .72 : width * .28, index < 2 ? height * .61 : height * .31, cardW, cardH));
  }
  handleTap(x: number, y: number) { const selected = this.cards.find((card) => Math.abs(x-card.x) <= card.width/2 && Math.abs(y-card.y) <= card.height/2); if(selected) this.onChoose(selected.hero.id); return true; }
  private addCard(hero: HeroDefinition) {
    const node = new Node(`Hero_${hero.id}`); node.parent = this.node; node.addComponent(UITransform); const graphics = node.addComponent(Graphics);
    const artNode = new Node('Portrait'); artNode.parent = node; artNode.addComponent(UITransform); const art = artNode.addComponent(Sprite); art.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load(`art/${hero.art}/spriteFrame`, SpriteFrame, (error, frame) => { if (!error && frame && art.isValid) art.spriteFrame = frame; });
    const heroName = this.label('Name', 31, new Color(255, 252, 228)); heroName.node.parent = node; heroName.string = hero.name;
    const trait = this.label('Trait', 20, new Color(255, 236, 111)); trait.node.parent = node; trait.string = hero.trait;
    const detail = this.label('Detail', 16, new Color(255, 248, 228)); detail.node.parent = node; detail.string = hero.detail;
    (node as HeroCardNode).g = graphics;
    (node as HeroCardNode).art = art;
    (node as HeroCardNode).heroName = heroName;
    (node as HeroCardNode).trait = trait;
    (node as HeroCardNode).detail = detail;
    this.cards.push({ hero, node, x: 0, y: 0, width: 0, height: 0 });
  }
  private layoutCard(card: HeroCard, x: number, y: number, width: number, height: number) {
    const node = card.node as HeroCardNode;
    card.x=x; card.y=y; card.width=width; card.height=height; card.node.setPosition(x,y); card.node.getComponent(UITransform)!.setContentSize(width,height);
    node.g!.clear(); node.g!.fillColor=new Color(65,46,35,210); node.g!.roundRect(-width/2+3,-height/2-5,width,height,28); node.g!.fill(); node.g!.fillColor=new Color(235,146,61); node.g!.roundRect(-width/2,-height/2,width,height,28); node.g!.fill(); node.g!.fillColor=new Color(255,245,205,235); node.g!.roundRect(-width/2+6,-height/2+6,width-12,height-12,23); node.g!.fill();
    node.art!.node.getComponent(UITransform)!.setContentSize(width*.55,height*.65); node.art!.node.setPosition(0,height*.14);
    node.heroName!.node.setPosition(0,-height*.17); node.trait!.node.setPosition(0,-height*.31); node.detail!.node.setPosition(0,-height*.42); node.detail!.overflow=Label.Overflow.SHRINK; node.detail!.node.getComponent(UITransform)!.setContentSize(width*.86,36);
  }
  private label(name:string,size:number,color:Color) { const node=new Node(name); node.addComponent(UITransform).setContentSize(620,62); const label=node.addComponent(Label); label.fontSize=size; label.lineHeight=size+6; label.color=color; label.horizontalAlign=Label.HorizontalAlign.CENTER; label.verticalAlign=Label.VerticalAlign.CENTER; const outline=node.addComponent(LabelOutline); outline.width=Math.max(2,Math.round(size*.08)); outline.color=new Color(87,58,37,220); return label; }
}
type HeroCardNode = Node & { g?: Graphics; art?: Sprite; heroName?: Label; trait?: Label; detail?: Label };
