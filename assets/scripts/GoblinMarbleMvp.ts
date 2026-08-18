import { _decorator, BoxCollider2D, CircleCollider2D, Collider2D, Color, Component, Contact2DType, ERigidBody2DType, Graphics, Input, input, Label, LabelOutline, Node, PhysicsSystem2D, resources, RigidBody2D, Size, Sprite, SpriteFrame, sys, tween, UITransform, UIOpacity, Vec2, Vec3, view } from 'cc';
import { PhysicsBoardFactory } from './PhysicsBoardFactory';
import { GameTelemetry } from './GameTelemetry';
import { PegSound } from './PegSound';
import { LobbyAction, LobbyLayer } from './LobbyLayer';
import { RewardedAdBridge } from './RewardedAdBridge';
import { UpgradeKind, UpgradeLayer } from './UpgradeLayer';
import { HeroId } from './HeroCatalog';
import { HeroSelectionLayer } from './HeroSelectionLayer';
import { UpgradeDefinition, UpgradeId, rollUpgrades } from './UpgradeCatalog';
import { BUILTIN_LAYOUTS, LevelLayout, PegType, loadCustomLayout } from './LevelLayout';
import { LevelEditorLayer } from './LevelEditorLayer';
const { ccclass } = _decorator;
type Peg = { pos: Vec2 };

/** Original pinball roguelite MVP. Attach this to Canvas. */
@ccclass('GoblinMarbleMvp')
export class GoblinMarbleMvp extends Component {
  private root!: Node; private g!: Graphics; private guide!: Graphics; private hud!: Label; private tip!: Label; private home!: Label; private lobby!: LobbyLayer; private upgrades!: UpgradeLayer; private heroes!: HeroSelectionLayer; private editor!: LevelEditorLayer;
  private backgroundVisual!: Sprite; private boardFrameVisual!: Sprite; private boardVisuals!: Node; private actorVisuals!: Node; private effectVisuals!: Node; private launcherVisual!: Sprite; private ballVisual!: Sprite; private cloneVisual!: Sprite;
  private pegVisuals = new Map<number, Sprite>(); private resetVisual!: Sprite; private bombVisual!: Sprite;
  private size = new Vec2(); private launcher = new Vec2(); private pointer = new Vec2();
  private ball = new Vec2(); private pegs: Peg[] = [];
  private resetPeg = new Vec2(); private bombPeg = new Vec2(); private bombUsed = false;
  private physicsRoot!: Node; private ballNode!: Node; private ballBody!: RigidBody2D; private ballCollider!: CircleCollider2D; private cloneNode!: Node; private cloneBody!: RigidBody2D; private cloneCollider!: CircleCollider2D;
  private pegColliders = new Map<number, CircleCollider2D>();
  private bonusPegs = new Map<number, { pos: Vec2; type: PegType; sprite: Sprite; used: boolean }>();
  private hit = new Map<number, number>(); private aiming = false; private flying = false; private resolving = false; private over = false;
  private timer = 0; private score = 0; private targetScore = 100; private levelWon = false; private stage = 1; private bestStage = 1; private coins = 0; private baseBalls = 4; private ballsLeft = 4;
  private idleTime = 0; private shakeTime = 0; private shakeStrength = 0;
  private bounceBonus = 0; private scoreBonus = 0; private splitEvery = 5; private ballRadius = 16; private launchSpeed = 760;
  private bombRadius = 115; private resetBonus = 0; private luckyChance = 0; private harvestBonus = 0; private echoCounter = 0; private shieldAvailable = false; private magnetStrength = 0; private rainbowBonus = false; private goldenShotAvailable = false; private milkShieldAvailable = false; private aftershock = 0; private radarBonus = 0;
  private selectedHero: HeroId = 'oldOx'; private heroEchoAvailable = false; private firstShot = true; private forcedSpring = false; private forcedSplit = false;
  private upgradeChoices: UpgradeDefinition[] = []; private ownedUpgrades = new Set<UpgradeId>();
  private playLeft = 44; private playRight = 676; private playTop = 1100; private playBottom = 150;
  private shotIndex = 0; private springBall = false; private splitBall = false; private splitTriggered = false;
  private readonly maxHitsPerPeg = 3;
  private readonly pegR = 21;
  private readonly floorY = 20; private readonly retain = .84;

  onLoad() {
    this.bestStage = Math.max(1, Number(sys.localStorage.getItem('cow-marble-best-stage')) || 1);
    this.coins = Math.max(0, Number(sys.localStorage.getItem('cow-marble-coins')) || 0);
    this.root = new Node('GameRoot'); this.root.parent = this.node;
    const background = new Node('Background'); background.parent = this.root; this.backgroundVisual = this.createSprite(background, 'pasture-board-bg-v1', 1);
    const art = new Node('Art'); art.parent = this.root; this.g = art.addComponent(Graphics);
    const aim = new Node('Aim'); aim.parent = this.root; this.guide = aim.addComponent(Graphics);
    this.boardVisuals = new Node('BoardVisuals'); this.boardVisuals.parent = this.root;
    this.actorVisuals = new Node('ActorVisuals'); this.actorVisuals.parent = this.root;
    this.effectVisuals = new Node('EffectVisuals'); this.effectVisuals.parent = this.root;
    this.launcherVisual = this.createSprite(this.actorVisuals, 'cow-launcher-v1', 190);
    this.ballVisual = this.createSprite(this.actorVisuals, 'ball-standard-v1', 52);
    this.cloneVisual = this.createSprite(this.actorVisuals, 'ball-standard-v1', 44); this.cloneVisual.node.active=false;
    const boardFrame = new Node('BoardFrame'); boardFrame.parent = this.root; this.boardFrameVisual = this.createSprite(boardFrame, 'cow-board-frame-v1', 1);
    this.hud = this.label('HUD', 30); this.tip = this.label('Tip', 26); this.home = this.label('Home', 23); this.home.string = '⌂ 大厅'; this.home.color = new Color(255, 247, 208);
    this.lobby = new LobbyLayer(this.root, (action) => this.onLobbyAction(action));
    this.upgrades = new UpgradeLayer(this.root, (kind) => { void this.chooseUpgrade(kind); });
    this.heroes = new HeroSelectionLayer(this.root, (hero) => this.chooseHero(hero));
    this.editor = new LevelEditorLayer(this.root, (layout) => this.useEditedLayout(layout));
    input.on(Input.EventType.TOUCH_START, this.down, this); input.on(Input.EventType.TOUCH_MOVE, this.move, this); input.on(Input.EventType.TOUCH_END, this.up, this);
  }
  start() { this.resize(); this.setupPhysics(); this.board(); this.tip.string = '从顶部向下拖动，松开发射'; this.openLobby(); GameTelemetry.track('game_start', { stage: this.stage, bestStage: this.bestStage }); }
  onDestroy() { input.off(Input.EventType.TOUCH_START, this.down, this); input.off(Input.EventType.TOUCH_MOVE, this.move, this); input.off(Input.EventType.TOUCH_END, this.up, this); }
  update(dt: number) { this.idleTime += dt; if(this.shakeTime>0){this.shakeTime-=dt;} this.resize(); if (this.flying) { this.ball.set(this.ballNode.position.x, this.ballNode.position.y); this.applyMagnet(); if (this.ballNode.active && this.ball.y < this.playBottom - this.ballRadius) this.saveOrLose(this.ballNode); if (this.cloneNode.active && this.cloneNode.position.y < this.playBottom - this.ballRadius) this.cloneNode.active=false; if(!this.ballNode.active&&!this.cloneNode.active)this.finishShot(); } if (this.resolving) this.resolve(dt); this.draw(); }

  private setupPhysics() {
    PhysicsSystem2D.instance.gravity = new Vec2(0, -1300);
    this.physicsRoot = new Node('PhysicsBoard'); this.physicsRoot.parent = this.root;
    this.ballNode = new Node('BallBody'); this.ballNode.parent = this.physicsRoot; this.ballNode.active = false;
    this.ballBody = this.ballNode.addComponent(RigidBody2D); this.ballBody.type = ERigidBody2DType.Dynamic; this.ballBody.gravityScale = 1; this.ballBody.fixedRotation = true; this.ballBody.linearDamping = .45; this.ballBody.enabledContactListener = true;
    this.ballCollider = this.ballNode.addComponent(CircleCollider2D); this.ballCollider.radius = this.ballRadius; this.ballCollider.restitution = this.retain; this.ballCollider.friction = .05; this.ballCollider.apply(); this.ballCollider.on(Contact2DType.BEGIN_CONTACT, this.onBallContact, this);
    this.cloneNode = new Node('SplitBallBody'); this.cloneNode.parent=this.physicsRoot; this.cloneNode.active=false;
    this.cloneBody=this.cloneNode.addComponent(RigidBody2D); this.cloneBody.type=ERigidBody2DType.Dynamic; this.cloneBody.gravityScale=1; this.cloneBody.fixedRotation=true; this.cloneBody.linearDamping=.45; this.cloneBody.enabledContactListener=true;
    this.cloneCollider=this.cloneNode.addComponent(CircleCollider2D); this.cloneCollider.radius=this.ballRadius*.82; this.cloneCollider.restitution=this.retain; this.cloneCollider.friction=.05; this.cloneCollider.apply(); this.cloneCollider.on(Contact2DType.BEGIN_CONTACT,this.onBallContact,this);
  }

  private label(name: string, size: number) {
    const n = new Node(name); n.parent = this.root; n.addComponent(UITransform).setContentSize(1100, 72);
    const l = n.addComponent(Label); l.fontSize = size; l.lineHeight = size + 8; l.color = new Color(255,250,226); l.horizontalAlign = Label.HorizontalAlign.CENTER; const outline=n.addComponent(LabelOutline); outline.width=Math.max(2,Math.round(size*.08)); outline.color=new Color(42,72,50,210); return l;
  }
  private createSprite(parent: Node, asset: string, size: number): Sprite {
    const node = new Node(asset); node.parent = parent;
    const transform = node.addComponent(UITransform); transform.setContentSize(size, size);
    const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load(`art/${asset}/spriteFrame`, SpriteFrame, (error, frame) => { if (!error && frame && sprite.isValid) sprite.spriteFrame = frame; });
    return sprite;
  }
  private setSprite(sprite: Sprite, asset: string) {
    if (sprite.node.name === asset) return;
    sprite.node.name = asset;
    resources.load(`art/${asset}/spriteFrame`, SpriteFrame, (error, frame) => { if (!error && frame && sprite.isValid) sprite.spriteFrame = frame; });
  }
  private resize() {
    const ui = this.node.getComponent(UITransform);
    const shakeX=this.shakeTime>0?(Math.random()-.5)*this.shakeStrength:0, shakeY=this.shakeTime>0?(Math.random()-.5)*this.shakeStrength:0;
    if (ui) { this.size.set(ui.contentSize.width, ui.contentSize.height); this.root.setPosition(-this.size.x * ui.anchorPoint.x+shakeX, -this.size.y * ui.anchorPoint.y+shakeY); }
    else { const v = view.getVisibleSize(); this.size.set(v.width,v.height); this.root.setPosition(-v.width/2+shakeX,-v.height/2+shakeY); }
    this.playLeft=Math.max(48,this.size.x*.085); this.playRight=this.size.x-this.playLeft; this.playBottom=Math.max(110,this.size.y*.135); this.launcher.set(this.size.x/2,this.size.y*.765); this.playTop=this.launcher.y+54;
    this.hud.node.setPosition(this.size.x/2,this.size.y-45); this.tip.node.setPosition(this.size.x/2,this.playBottom-46); this.home.node.setPosition(72,this.size.y-45);
    const backgroundTransform=this.backgroundVisual.node.getComponent(UITransform); backgroundTransform?.setContentSize(this.size.x,this.size.y); this.backgroundVisual.node.setPosition(this.size.x/2,this.size.y/2);
    const frameTransform=this.boardFrameVisual.node.getComponent(UITransform); frameTransform?.setContentSize(this.size.x,this.size.y); this.boardFrameVisual.node.setPosition(this.size.x/2,this.size.y/2);
    if(this.lobby)this.lobby.resize(this.size.x,this.size.y);
    if(this.upgrades)this.upgrades.resize(this.size.x,this.size.y);
    if(this.heroes)this.heroes.resize(this.size.x,this.size.y);
    if(this.editor)this.editor.resize(this.size.x,this.size.y);
  }
  private board() {
    if (this.physicsRoot) this.physicsRoot.removeAllChildren();
    if (this.physicsRoot) { this.physicsRoot.addChild(this.ballNode); this.physicsRoot.addChild(this.cloneNode); this.ballNode.active = false; this.cloneNode.active=false; }
    this.hit.clear(); this.pegColliders.clear(); this.bonusPegs.clear(); this.bombUsed=false; this.pegs=[]; const layoutIndex=(this.stage-1)%BUILTIN_LAYOUTS.length; const layout=loadCustomLayout() ?? BUILTIN_LAYOUTS[layoutIndex]; const top=this.launcher.y-92, bottom=this.playBottom+84;
    layout.pegs.filter((peg)=>peg.type==='normal').forEach((peg) => this.pegs.push({pos:new Vec2(this.playLeft+peg.x*(this.playRight-this.playLeft), bottom+peg.y*(top-bottom))}));
    this.pegs.forEach((peg, i) => this.pegColliders.set(i, PhysicsBoardFactory.circle(this.physicsRoot, `Peg_${i}`, peg.pos, this.pegR, i + 1)));
    const specialPositions=[[.24,.47,.76,.57],[.76,.43,.25,.63],[.5,.55,.78,.35]][layoutIndex];
    this.resetPeg.set(this.playLeft+(this.playRight-this.playLeft)*specialPositions[0], this.playBottom+(this.playTop-this.playBottom)*specialPositions[1]); this.bombPeg.set(this.playLeft+(this.playRight-this.playLeft)*specialPositions[2], this.playBottom+(this.playTop-this.playBottom)*specialPositions[3]);
    const placedReset=layout.pegs.find((peg)=>peg.type==='reset'), placedBomb=layout.pegs.find((peg)=>peg.type==='bomb');
    if(placedReset)this.resetPeg.set(this.playLeft+placedReset.x*(this.playRight-this.playLeft),bottom+placedReset.y*(top-bottom));
    if(placedBomb)this.bombPeg.set(this.playLeft+placedBomb.x*(this.playRight-this.playLeft),bottom+placedBomb.y*(top-bottom));
    PhysicsBoardFactory.circle(this.physicsRoot, 'ResetPeg', this.resetPeg, this.pegR + 3, 201);
    PhysicsBoardFactory.circle(this.physicsRoot, 'BombPeg', this.bombPeg, this.pegR + 3, 202);
    PhysicsBoardFactory.box(this.physicsRoot, 'WallLeft', new Vec2(this.playLeft-8, (this.playTop+this.playBottom)/2), new Size(16, this.playTop-this.playBottom));
    PhysicsBoardFactory.box(this.physicsRoot, 'WallRight', new Vec2(this.playRight+8, (this.playTop+this.playBottom)/2), new Size(16, this.playTop-this.playBottom));
    PhysicsBoardFactory.box(this.physicsRoot, 'WallTop', new Vec2(this.size.x / 2, this.playTop+8), new Size(this.playRight-this.playLeft+16, 16));
    this.boardVisuals.removeAllChildren(); this.pegVisuals.clear();
    this.pegs.forEach((peg, index) => { const sprite=this.createSprite(this.boardVisuals, 'pin-green-v1', 70); sprite.node.setPosition(peg.pos.x,peg.pos.y); this.pegVisuals.set(index,sprite); });
    this.resetVisual=this.createSprite(this.boardVisuals,'pin-reset-v1',80); this.resetVisual.node.setPosition(this.resetPeg.x,this.resetPeg.y);
    this.bombVisual=this.createSprite(this.boardVisuals,'pin-bomb-v1',80); this.bombVisual.node.setPosition(this.bombPeg.x,this.bombPeg.y);
    let specialTag=203;
    layout.pegs.filter((peg)=>['normal','reset','bomb'].indexOf(peg.type)<0).forEach((peg)=>{const pos=new Vec2(this.playLeft+peg.x*(this.playRight-this.playLeft),bottom+peg.y*(top-bottom));PhysicsBoardFactory.circle(this.physicsRoot,`Bonus_${specialTag}`,pos,this.pegR+2,specialTag);const sprite=this.createSprite(this.boardVisuals,'pin-green-v1',76);sprite.node.setPosition(pos.x,pos.y);sprite.color=this.bonusColor(peg.type);this.bonusPegs.set(specialTag,{pos,type:peg.type,sprite,used:false});specialTag++;});
  }
  private down(e: TouchEventLike) {
    this.pointer.set(e.getUILocation().x,e.getUILocation().y);
    if(this.lobby.visible){this.lobby.handleTap(this.pointer.x,this.pointer.y);return;}
    if(this.heroes.visible){this.heroes.handleTap(this.pointer.x,this.pointer.y);return;}
    if(this.editor.visible){this.editor.handleTap(this.pointer.x,this.pointer.y);return;}
    if(this.upgrades.visible){this.upgrades.handleTap(this.pointer.x,this.pointer.y);return;}
    if(this.flying||this.resolving) return;
    if(this.pointer.x<130&&this.pointer.y>this.size.y-82){this.openLobby();return;}
    if(this.over) { this.retryStage(); return; }
    if(this.pointer.y<this.launcher.y-12) this.aiming=true;
  }
  private move(e: TouchEventLike) { if(this.aiming) this.pointer.set(e.getUILocation().x,e.getUILocation().y); }
  private up(e: TouchEventLike) {
    if(!this.aiming) return; this.pointer.set(e.getUILocation().x,e.getUILocation().y); this.aiming=false; PegSound.unlock();
    const d=this.pointer.clone().subtract(this.launcher); if(d.y>=-35) return; d.normalize();
    if(this.ballsLeft<=0){this.over=true;this.tip.string='弹珠用尽！轻触屏幕重试本关';return;}
    this.ballsLeft--; this.shotIndex++; this.splitBall=this.forcedSplit || this.shotIndex%this.splitEvery===0; this.splitTriggered=false; this.springBall=!this.splitBall&&(this.forcedSpring || this.shotIndex%3===0); this.forcedSplit=false; this.forcedSpring=false; this.heroEchoAvailable=this.selectedHero==='grandpaBull'; this.ballCollider.restitution=Math.min(1.25,this.retain+this.bounceBonus+(this.springBall ? .16 : 0)); this.ballCollider.apply(); this.cloneCollider.restitution=this.ballCollider.restitution; this.cloneCollider.apply(); this.ball.set(this.launcher); this.ballNode.setPosition(this.launcher.x, this.launcher.y); this.ballNode.active=true; this.cloneNode.active=false; this.ballBody.linearVelocity=d.multiplyScalar(this.launchSpeed); this.launchBurst(); this.flying=true; this.firstShot=false; this.tip.string=this.splitBall?'分裂球！首次撞钉后分成两颗':this.springBall?'高弹力球！本次反弹更强':'绿钉 3 分，蓝钉 2 分，灰钉 1 分'; GameTelemetry.track('shot_start', { stage: this.stage, shot: this.shotIndex, ballsLeft:this.ballsLeft, ballType: this.splitBall ? 'split' : this.springBall ? 'spring' : 'normal', hero: this.selectedHero });
  }
  private onBallContact(self: Collider2D, other: Collider2D) {
    if (!this.flying) return;
    if (other.tag > 0 && other.tag < 100) { this.scorePeg(other.tag - 1); if(this.heroEchoAvailable){this.heroEchoAvailable=false;this.addBonusScore(4,this.pegs[other.tag-1].pos,'牛爷爷回响');} if(this.splitBall&&!this.splitTriggered){this.splitTriggered=true;const body=self.node.getComponent(RigidBody2D)!;const pos=self.node.position;const velocity=body.linearVelocity;this.hitImpact(new Vec2(pos.x,pos.y),new Color(127,205,255),1.6);this.scheduleOnce(()=>{this.cloneNode.setPosition(pos.x,pos.y);this.cloneNode.active=true;this.cloneBody.linearVelocity=new Vec2(-velocity.x*.72,velocity.y*.9);},0);} }
    if (other.tag === 201) { const nextPosition=new Vec2(this.playLeft+50 + Math.random()*(this.playRight-this.playLeft-100), this.playBottom+100 + Math.random()*(this.playTop-this.playBottom-210)); this.hit.clear(); this.hitImpact(this.resetPeg,new Color(211,113,248),2); this.addBonusScore(this.resetBonus,this.resetPeg,'丰收重置'); this.tip.string='全盘重置！所有普通钉子恢复绿色'; PegSound.play('reset'); GameTelemetry.track('special_hit', { stage: this.stage, kind: 'reset' }); this.scheduleOnce(() => { this.pegColliders.forEach((collider) => collider.enabled=true); this.resetPeg.set(nextPosition); other.node.setPosition(nextPosition.x,nextPosition.y); other.apply(); }, 0); }
    if (other.tag === 202 && !this.bombUsed) { this.bombUsed=true; other.enabled=false; this.hitImpact(this.bombPeg,new Color(255,119,64),3); this.shake(.22,15); PegSound.play('bomb'); GameTelemetry.track('special_hit', { stage: this.stage, kind: 'bomb' }); this.pegs.forEach((peg,index)=>{if(peg.pos.clone().subtract(this.bombPeg).length()<this.bombRadius+this.aftershock)this.scorePeg(index);}); this.tip.string='爆炸钉子！附近钉子全部触发'; }
    if(other.tag>=203){this.hitBonusPeg(other.tag,self,other);}
  }
  private scorePeg(index:number) { const count=this.hit.get(index)??0; if(count>=this.maxHitsPerPeg)return; const next=count+1; let points=[3,2,1][count]+this.scoreBonus; if(this.luckyChance&&Math.random()<this.luckyChance)points*=2; if(this.rainbowBonus)points+=Math.floor(Math.random()*4); if(this.goldenShotAvailable){points+=10;this.goldenShotAvailable=false;} this.hit.set(index,next); this.score+=points; this.hitImpact(this.pegs[index].pos, count===0?new Color(106,225,118):count===1?new Color(102,190,255):new Color(214,220,231), next===this.maxHitsPerPeg?1.15:.8); const pegSprite=this.pegVisuals.get(index); if(pegSprite)tween(pegSprite.node).stop().to(.06,{scale:new Vec3(1.28,1.28,1)}).to(.14,{scale:Vec3.ONE}).start(); this.echoCounter++; if(this.echoCounter%4===0)this.addBonusScore(4,this.pegs[index].pos,'铃铛回响'); PegSound.play(count===0?'green':count===1?'blue':'gray'); GameTelemetry.track('peg_hit', { stage: this.stage, points, pegState: next, score: this.score }); this.scorePopup(points,this.pegs[index].pos); if(next===this.maxHitsPerPeg)this.pegColliders.get(index)!.enabled=false; this.tip.string=`+${points} 分！当前 ${this.score}/${this.targetScore}`; if(this.score>=this.targetScore)this.levelWon=true; }
  private scorePopup(points:number, position:Vec2) { const node=new Node('ScorePopup'); node.parent=this.root; node.setPosition(position.x,position.y+20); node.addComponent(UITransform).setContentSize(90,50); const label=node.addComponent(Label); label.string=`+${points}`; label.fontSize=30; label.lineHeight=34; label.color=points===3?new Color(255,228,72):points===2?new Color(104,200,255):new Color(225,225,225); label.horizontalAlign=Label.HorizontalAlign.CENTER; const opacity=node.addComponent(UIOpacity); tween(node).to(.32,{position:new Vec3(position.x,position.y+75,0)}).call(()=>node.destroy()).start(); tween(opacity).delay(.14).to(.18,{opacity:0}).start(); }
  private finishShot() {
    if (!this.flying) return;
    this.flying=false; this.ballBody.linearVelocity=Vec2.ZERO; this.ballNode.active=false; this.resolving=true; this.timer=0; GameTelemetry.track('shot_end', { stage: this.stage, shot: this.shotIndex, score: this.score, cleared: this.levelWon });
  }
  private resolve(dt:number) {
    this.timer+=dt;
    if(this.timer<.35) return;
    this.resolving=false;
    if(this.levelWon){this.upgradeChoices=rollUpgrades(3,this.ownedUpgrades);this.upgrades.show(this.upgradeChoices);this.tip.string='本关达成！选择一项强化继续闯关';return;}
    if(this.ballsLeft<=0){if(this.shieldAvailable){this.shieldAvailable=false;this.ballsLeft=1;this.tip.string='牧场护符生效！返还 1 颗弹珠';return;}this.over=true;this.tip.string='弹珠用尽！轻触屏幕重试本关';return;}
    this.tip.string=`继续投珠 · 剩余 ${this.ballsLeft} 颗`;
  }
  private async chooseUpgrade(kind:UpgradeKind){
    if(kind==='all' && RewardedAdBridge.isConfigured){const rewarded=await RewardedAdBridge.show('level_clear_all_upgrades');if(!rewarded)return;}
    if(kind==='all'){this.upgradeChoices.forEach((upgrade)=>this.applyUpgrade(upgrade.id));}else this.applyUpgrade(kind);
    this.upgrades.hide(); this.completeLevel();
  }
  private applyUpgrade(kind:Exclude<UpgradeKind,'all'>){this.ownedUpgrades.add(kind);if(kind==='bounce')this.bounceBonus=Math.min(.45,this.bounceBonus+.12);if(kind==='combo')this.scoreBonus=Math.min(8,this.scoreBonus+1);if(kind==='split')this.splitEvery=Math.max(2,this.splitEvery-1);if(kind==='giant'){this.ballRadius=Math.min(31,this.ballRadius+3);this.applyBallRadius();}if(kind==='speed')this.launchSpeed=Math.min(1050,this.launchSpeed+55);if(kind==='extraBall'){this.baseBalls=Math.min(15,this.baseBalls+1);this.ballsLeft++;}if(kind==='bombRange')this.bombRadius+=28;if(kind==='resetBonus')this.resetBonus+=12;if(kind==='lucky')this.luckyChance=Math.min(.75,this.luckyChance+.25);if(kind==='harvest')this.harvestBonus+=15;if(kind==='springStart')this.forcedSpring=true;if(kind==='twinStart')this.forcedSplit=true;if(kind==='echo')this.echoCounter=3;if(kind==='shield')this.shieldAvailable=true;if(kind==='magnet')this.magnetStrength=Math.min(160,this.magnetStrength+40);if(kind==='rainbow')this.rainbowBonus=true;if(kind==='goldenShot')this.goldenShotAvailable=true;if(kind==='aftershock')this.aftershock+=45;if(kind==='milkShield')this.milkShieldAvailable=true;if(kind==='pinVision')this.radarBonus++;}
  private completeLevel(){const clearedStage=this.stage;const reward=20+clearedStage*5+this.harvestBonus;this.stage++;this.bestStage=Math.max(this.bestStage,this.stage);this.baseBalls=Math.min(12,this.baseBalls+1);this.ballsLeft=this.baseBalls;this.firstShot=true;this.coins+=reward;sys.localStorage.setItem('cow-marble-best-stage',String(this.bestStage));sys.localStorage.setItem('cow-marble-coins',String(this.coins));GameTelemetry.track('level_complete', { stage: clearedStage, nextStage: this.stage, score: this.score, balls:this.baseBalls, coinsAwarded: reward, coinsTotal: this.coins });this.score=0;this.targetScore=70+this.stage*30;this.levelWon=false;this.board();this.tip.string=`过关！基础弹珠 +1，当前 ${this.baseBalls} 颗`;}
  private retryStage(){this.score=0;this.ballsLeft=this.baseBalls;this.firstShot=true;this.levelWon=false;this.over=false;this.board();this.tip.string=`重新挑战第 ${this.stage} 关 · ${this.ballsLeft} 颗弹珠`;}
  private openLobby(){this.lobby.show(`第 ${this.stage} 关 · 牛币 ${this.coins} · 基础弹珠 ${this.baseBalls}`);this.tip.string='从大厅点击“开始闯关”进入棋盘';}
  private onLobbyAction(action:LobbyAction){
    if(action==='start'){this.heroes.show();return;}
    if(action==='daily'){const key=new Date().toISOString().slice(0,10);if(sys.localStorage.getItem('cow-marble-daily')===key){this.lobby.showModal('今日已领取','明天再来牧场领取牛币补给吧！');return;}this.coins+=25;sys.localStorage.setItem('cow-marble-coins',String(this.coins));sys.localStorage.setItem('cow-marble-daily',key);GameTelemetry.track('daily_claim',{coins:25,total:this.coins});this.lobby.showModal('补给到账','获得 25 牛币！每天回来都有补给。');return;}
    if(action==='supply'){void this.claimSupply();return;}
    if(action==='notice'){this.lobby.showModal('牧场公告','欢迎来到对牛弹珠！\n绿色、蓝色、灰色牛铃依次得 3、2、1 分。\n撞到特殊钉子会发生惊喜变化。');return;}
    if(action==='guide'){this.lobby.showModal('玩法说明','每关拥有有限弹珠，达成目标分数才能过关。\n过关后基础弹珠 +1，并可选择一种强化。\n紫色钉子重置普通钉子；橙色钉子触发附近目标。');return;}
    if(action==='invite'){this.lobby.showModal('邀请好友','分享入口已预留。接入抖音 AppID 后，可调用平台分享能力邀请好友一起来闯关。');return;}
    if(action==='settings'){this.editor.show(loadCustomLayout());return;}
    this.lobby.showModal('添加到桌面','此入口将在抖音真机环境中调用“添加到桌面”能力；浏览器预览中无需操作。');
  }
  private async claimSupply(){if(!RewardedAdBridge.isConfigured){this.lobby.showModal('免费补给','激励视频广告位尚未配置。接入广告位后，完整观看即可领取 30 牛币。');return;}const rewarded=await RewardedAdBridge.show('lobby_free_supply');if(!rewarded){this.lobby.showModal('暂未领取','广告未完整播放，请稍后再试。');return;}this.coins+=30;sys.localStorage.setItem('cow-marble-coins',String(this.coins));GameTelemetry.track('supply_claim',{coins:30,total:this.coins});this.lobby.showModal('补给到账','获得 30 牛币！');}
  private chooseHero(hero:HeroId){this.selectedHero=hero;this.ballRadius=16;this.launchSpeed=760;this.forcedSplit=false;this.heroEchoAvailable=false;if(hero==='oldOx')this.ballRadius=24;if(hero==='milkCow')this.forcedSplit=true;if(hero==='calf')this.launchSpeed=915;this.applyBallRadius();this.heroes.hide();this.lobby.hide();this.tip.string=`${hero==='oldOx'?'老黄牛巨型弹珠':hero==='grandpaBull'?'牛爷爷回响弹珠':hero==='milkCow'?'奶牛分裂弹珠':'牛犊子冲刺弹珠'}已就位！向下拖动发射`;GameTelemetry.track('hero_selected',{hero});}
  private useEditedLayout(layout:LevelLayout){this.targetScore=layout.target;this.board();this.lobby.hide();this.tip.string='自定义布局已保存并加载，向下拖动开始测试';}
  private applyBallRadius(){if(!this.ballCollider)return;this.ballCollider.radius=this.ballRadius;this.ballCollider.apply();this.cloneCollider.radius=this.ballRadius*.82;this.cloneCollider.apply();}
  private saveOrLose(ball:Node){if(this.milkShieldAvailable&&ball===this.ballNode){this.milkShieldAvailable=false;ball.setPosition(this.launcher.x,this.playBottom+130);this.ballBody.linearVelocity=new Vec2(0,450);this.tip.string='奶泡护盾救回弹珠！';return;}ball.active=false;}
  private applyMagnet(){if(!this.magnetStrength)return;const body=this.ballBody;if(!this.ballNode.active)return;let best:Vec2|undefined;let distance=999;this.pegs.forEach((peg,index)=>{if((this.hit.get(index)??0)>=this.maxHitsPerPeg)return;const d=peg.pos.clone().subtract(this.ball);const len=d.length();if(len<distance){distance=len;best=d;}});if(best&&distance<210){best.normalize();body.linearVelocity=body.linearVelocity.add(best.multiplyScalar(this.magnetStrength*.018));}}
  private addBonusScore(points:number,position:Vec2,label:string){if(points<=0)return;this.score+=points;this.scorePopup(points,position);this.tip.string=`${label} +${points} 分！`;if(this.score>=this.targetScore)this.levelWon=true;}
  private hitBonusPeg(tag:number,self:Collider2D,other:Collider2D){const peg=this.bonusPegs.get(tag);if(!peg||peg.used)return;peg.used=true;other.enabled=false;peg.sprite.node.active=false;const color=this.bonusColor(peg.type);this.hitImpact(peg.pos,color,peg.type==='prism'?2.2:1.5);if(peg.type==='gold'){this.addBonusScore(12,peg.pos,'黄金钉');this.coins+=3;}if(peg.type==='spring'){const body=self.node.getComponent(RigidBody2D)!;body.linearVelocity=new Vec2(body.linearVelocity.x,Math.max(760,Math.abs(body.linearVelocity.y)+300));this.addBonusScore(5,peg.pos,'弹簧钉');}if(peg.type==='split'){this.splitBall=true;this.splitTriggered=false;this.triggerSplit(self);this.addBonusScore(5,peg.pos,'分裂钉');}if(peg.type==='coin'){this.coins+=15;this.addBonusScore(4,peg.pos,'牛币钉');}if(peg.type==='prism'){const roll=Math.floor(Math.random()*3);if(roll===0)this.addBonusScore(15,peg.pos,'彩虹棱镜');if(roll===1){this.springBall=true;this.addBonusScore(8,peg.pos,'高弹棱镜');}if(roll===2){this.splitBall=true;this.splitTriggered=false;this.triggerSplit(self);this.addBonusScore(8,peg.pos,'分裂棱镜');}}
  }
  private triggerSplit(self:Collider2D){if(this.splitTriggered)return;this.splitTriggered=true;const body=self.node.getComponent(RigidBody2D)!;const pos=self.node.position;const velocity=body.linearVelocity;this.hitImpact(new Vec2(pos.x,pos.y),new Color(127,205,255),1.6);this.scheduleOnce(()=>{this.cloneNode.setPosition(pos.x,pos.y);this.cloneNode.active=true;this.cloneBody.linearVelocity=new Vec2(-velocity.x*.72,velocity.y*.9);},0);}
  private bonusColor(type:PegType){if(type==='gold'||type==='coin')return new Color(246,190,51);if(type==='spring')return new Color(255,111,181);if(type==='split')return new Color(95,173,250);if(type==='prism')return new Color(151,103,238);return new Color(83,196,112);}
  private launchBurst(){this.hitImpact(this.launcher,new Color(255,228,105),1.5);this.shake(.10,5);tween(this.launcherVisual.node).stop().to(.06,{scale:new Vec3(.84,.84,1)}).to(.18,{scale:new Vec3(1.08,1.08,1)}).to(.12,{scale:Vec3.ONE}).start();}
  private hitImpact(position:Vec2,color:Color,power:number){const node=new Node('Impact');node.parent=this.effectVisuals;node.setPosition(position.x,position.y);node.addComponent(UITransform).setContentSize(160,160);const g=node.addComponent(Graphics);g.lineWidth=5;g.strokeColor=color;g.circle(0,0,13);g.stroke();for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;g.moveTo(Math.cos(angle)*19,Math.sin(angle)*19);g.lineTo(Math.cos(angle)*38,Math.sin(angle)*38);g.stroke();}const opacity=node.addComponent(UIOpacity);tween(node).to(.22,{scale:new Vec3(power,power,1)}).call(()=>node.destroy()).start();tween(opacity).to(.20,{opacity:0}).start();this.shake(.06,Math.round(5*power));}
  private shake(duration:number,strength:number){this.shakeTime=Math.max(this.shakeTime,duration);this.shakeStrength=Math.max(this.shakeStrength,strength);}
  private draw() {
    this.g.clear();this.guide.clear();this.g.fillColor=new Color(12,50,61,18);this.g.rect(0,0,this.size.x,this.size.y);this.g.fill();this.g.fillColor=new Color(255,252,231,118);this.g.roundRect(this.playLeft+20,this.size.y-84,this.playRight-this.playLeft-40,60,28);this.g.fill();
    this.pegs.forEach((p,i)=>{const count=this.hit.get(i)??0;if(count>=this.maxHitsPerPeg)return;this.g.fillColor=count===0?new Color(83,196,112):count===1?new Color(76,151,232):new Color(120,128,143);this.g.circle(p.pos.x,p.pos.y,this.pegR);this.g.fill();});
    this.g.fillColor=new Color(182,92,222);this.g.circle(this.resetPeg.x,this.resetPeg.y,this.pegR+3);this.g.fill();
    if(!this.bombUsed){this.g.fillColor=new Color(244,113,53);this.g.circle(this.bombPeg.x,this.bombPeg.y,this.pegR+3);this.g.fill();}
    this.g.fillColor=new Color(154,211,255);this.g.circle(this.launcher.x,this.launcher.y,18);this.g.fill();
    if(this.flying){this.g.fillColor=this.springBall?new Color(255,109,181):new Color(255,226,105);this.g.circle(this.ball.x,this.ball.y,this.ballRadius);this.g.fill();}
    if(this.aiming){const d=this.pointer.clone().subtract(this.launcher);d.normalize();this.guide.strokeColor=new Color(255,255,255,180);this.guide.lineWidth=2;this.guide.moveTo(this.launcher.x,this.launcher.y);this.guide.lineTo(this.launcher.x+d.x*150,this.launcher.y+d.y*150);this.guide.stroke();}
    this.hud.string=`第 ${this.stage} 关   积分 ${this.score}/${this.targetScore}   弹珠 ${this.ballsLeft}/${this.baseBalls}   牛币 ${this.coins}`;this.home.node.active=!this.lobby.visible&&!this.upgrades.visible&&!this.heroes.visible;
    this.pegVisuals.forEach((sprite,index)=>{const count=this.hit.get(index)??0;sprite.node.active=count<this.maxHitsPerPeg;this.setSprite(sprite,count===0?'pin-green-v1':count===1?'pin-blue-v1':'pin-gray-v1');});
    this.resetVisual.node.setPosition(this.resetPeg.x,this.resetPeg.y);
    this.bombVisual.node.active=!this.bombUsed;
    this.launcherVisual.node.setPosition(this.launcher.x,this.launcher.y);
    if(!this.flying&&this.launcherVisual.node.scale.x===1)this.launcherVisual.node.setScale(1+Math.sin(this.idleTime*2.4)*.018,1+Math.sin(this.idleTime*2.4)*.018,1);
    this.ballVisual.node.active=this.ballNode.active;
    this.setSprite(this.ballVisual,this.springBall?'ball-spring-v1':'ball-standard-v1');
    this.ballVisual.node.getComponent(UITransform)?.setContentSize(this.ballRadius*3.25,this.ballRadius*3.25);this.ballVisual.node.setPosition(this.ball.x,this.ball.y);
    this.cloneVisual.node.active=this.cloneNode.active;
    this.cloneVisual.node.setPosition(this.cloneNode.position.x,this.cloneNode.position.y);
  }
  private bar(x:number,y:number,w:number,h:number,r:number,c:Color){this.g.fillColor=new Color(42,50,63);this.g.rect(x,y,w,h);this.g.fill();this.g.fillColor=c;this.g.rect(x+2,y+2,(w-4)*Math.max(0,r),h-4);this.g.fill();}
}
interface TouchEventLike { getUILocation(): {x:number;y:number}; }
