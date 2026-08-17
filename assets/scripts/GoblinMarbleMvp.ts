import { _decorator, BoxCollider2D, CircleCollider2D, Collider2D, Color, Component, Contact2DType, ERigidBody2DType, Graphics, Input, input, Label, LabelOutline, Node, PhysicsSystem2D, resources, RigidBody2D, Size, Sprite, SpriteFrame, sys, tween, UITransform, UIOpacity, Vec2, Vec3, view } from 'cc';
import { PhysicsBoardFactory } from './PhysicsBoardFactory';
import { GameTelemetry } from './GameTelemetry';
import { PegSound } from './PegSound';
import { LobbyAction, LobbyLayer } from './LobbyLayer';
import { RewardedAdBridge } from './RewardedAdBridge';
const { ccclass } = _decorator;
type Peg = { pos: Vec2 };

/** Original pinball roguelite MVP. Attach this to Canvas. */
@ccclass('GoblinMarbleMvp')
export class GoblinMarbleMvp extends Component {
  private root!: Node; private g!: Graphics; private guide!: Graphics; private hud!: Label; private tip!: Label; private home!: Label; private lobby!: LobbyLayer;
  private backgroundVisual!: Sprite; private boardVisuals!: Node; private actorVisuals!: Node; private launcherVisual!: Sprite; private ballVisual!: Sprite; private cloneVisual!: Sprite;
  private pegVisuals = new Map<number, Sprite>(); private resetVisual!: Sprite; private bombVisual!: Sprite;
  private size = new Vec2(); private launcher = new Vec2(); private pointer = new Vec2();
  private ball = new Vec2(); private pegs: Peg[] = [];
  private resetPeg = new Vec2(); private bombPeg = new Vec2(); private bombUsed = false;
  private physicsRoot!: Node; private ballNode!: Node; private ballBody!: RigidBody2D; private ballCollider!: CircleCollider2D; private cloneNode!: Node; private cloneBody!: RigidBody2D; private cloneCollider!: CircleCollider2D;
  private pegColliders = new Map<number, CircleCollider2D>();
  private hit = new Map<number, number>(); private aiming = false; private flying = false; private resolving = false; private over = false;
  private timer = 0; private score = 0; private targetScore = 100; private levelWon = false; private stage = 1; private bestStage = 1; private coins = 0;
  private shotIndex = 0; private springBall = false; private splitBall = false; private splitTriggered = false;
  private readonly maxHitsPerPeg = 3;
  private readonly ballR = 16; private readonly pegR = 21;
  private readonly floorY = 20; private readonly speed = 760; private readonly retain = .84;

  onLoad() {
    this.bestStage = Math.max(1, Number(sys.localStorage.getItem('cow-marble-best-stage')) || 1);
    this.coins = Math.max(0, Number(sys.localStorage.getItem('cow-marble-coins')) || 0);
    this.root = new Node('GameRoot'); this.root.parent = this.node;
    const background = new Node('Background'); background.parent = this.root; this.backgroundVisual = this.createSprite(background, 'pasture-board-bg-v1', 1);
    const art = new Node('Art'); art.parent = this.root; this.g = art.addComponent(Graphics);
    const aim = new Node('Aim'); aim.parent = this.root; this.guide = aim.addComponent(Graphics);
    this.boardVisuals = new Node('BoardVisuals'); this.boardVisuals.parent = this.root;
    this.actorVisuals = new Node('ActorVisuals'); this.actorVisuals.parent = this.root;
    this.launcherVisual = this.createSprite(this.actorVisuals, 'cow-launcher-v1', 190);
    this.ballVisual = this.createSprite(this.actorVisuals, 'ball-standard-v1', 52);
    this.cloneVisual = this.createSprite(this.actorVisuals, 'ball-standard-v1', 44); this.cloneVisual.node.active=false;
    this.hud = this.label('HUD', 30); this.tip = this.label('Tip', 26); this.home = this.label('Home', 23); this.home.string = '⌂ 大厅'; this.home.color = new Color(255, 247, 208);
    this.lobby = new LobbyLayer(this.root, (action) => this.onLobbyAction(action));
    input.on(Input.EventType.TOUCH_START, this.down, this); input.on(Input.EventType.TOUCH_MOVE, this.move, this); input.on(Input.EventType.TOUCH_END, this.up, this);
  }
  start() { this.resize(); this.setupPhysics(); this.board(); this.tip.string = '从顶部向下拖动，松开发射'; this.openLobby(); GameTelemetry.track('game_start', { stage: this.stage, bestStage: this.bestStage }); }
  onDestroy() { input.off(Input.EventType.TOUCH_START, this.down, this); input.off(Input.EventType.TOUCH_MOVE, this.move, this); input.off(Input.EventType.TOUCH_END, this.up, this); }
  update(dt: number) { this.resize(); if (this.flying) { this.ball.set(this.ballNode.position.x, this.ballNode.position.y); if (this.ballNode.active && this.ball.y < -this.ballR) this.ballNode.active=false; if (this.cloneNode.active && this.cloneNode.position.y < -this.ballR) this.cloneNode.active=false; if(!this.ballNode.active&&!this.cloneNode.active)this.finishShot(); } if (this.resolving) this.resolve(dt); this.draw(); }

  private setupPhysics() {
    PhysicsSystem2D.instance.gravity = new Vec2(0, -1300);
    this.physicsRoot = new Node('PhysicsBoard'); this.physicsRoot.parent = this.root;
    this.ballNode = new Node('BallBody'); this.ballNode.parent = this.physicsRoot; this.ballNode.active = false;
    this.ballBody = this.ballNode.addComponent(RigidBody2D); this.ballBody.type = ERigidBody2DType.Dynamic; this.ballBody.gravityScale = 1; this.ballBody.fixedRotation = true; this.ballBody.linearDamping = .45; this.ballBody.enabledContactListener = true;
    this.ballCollider = this.ballNode.addComponent(CircleCollider2D); this.ballCollider.radius = this.ballR; this.ballCollider.restitution = this.retain; this.ballCollider.friction = .05; this.ballCollider.apply(); this.ballCollider.on(Contact2DType.BEGIN_CONTACT, this.onBallContact, this);
    this.cloneNode = new Node('SplitBallBody'); this.cloneNode.parent=this.physicsRoot; this.cloneNode.active=false;
    this.cloneBody=this.cloneNode.addComponent(RigidBody2D); this.cloneBody.type=ERigidBody2DType.Dynamic; this.cloneBody.gravityScale=1; this.cloneBody.fixedRotation=true; this.cloneBody.linearDamping=.45; this.cloneBody.enabledContactListener=true;
    this.cloneCollider=this.cloneNode.addComponent(CircleCollider2D); this.cloneCollider.radius=this.ballR*.82; this.cloneCollider.restitution=this.retain; this.cloneCollider.friction=.05; this.cloneCollider.apply(); this.cloneCollider.on(Contact2DType.BEGIN_CONTACT,this.onBallContact,this);
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
    if (ui) { this.size.set(ui.contentSize.width, ui.contentSize.height); this.root.setPosition(-this.size.x * ui.anchorPoint.x, -this.size.y * ui.anchorPoint.y); }
    else { const v = view.getVisibleSize(); this.size.set(v.width,v.height); this.root.setPosition(-v.width/2,-v.height/2); }
    this.launcher.set(this.size.x/2, this.size.y-Math.max(76, this.size.y*.065)); this.hud.node.setPosition(this.size.x/2,this.size.y-33); this.tip.node.setPosition(this.size.x/2,28); this.home.node.setPosition(64,this.size.y-34);
    const backgroundTransform=this.backgroundVisual.node.getComponent(UITransform); backgroundTransform?.setContentSize(this.size.x,this.size.y); this.backgroundVisual.node.setPosition(this.size.x/2,this.size.y/2);
    if(this.lobby)this.lobby.resize(this.size.x,this.size.y);
  }
  private board() {
    if (this.physicsRoot) this.physicsRoot.removeAllChildren();
    if (this.physicsRoot) { this.physicsRoot.addChild(this.ballNode); this.physicsRoot.addChild(this.cloneNode); this.ballNode.active = false; this.cloneNode.active=false; }
    this.hit.clear(); this.pegColliders.clear(); this.bombUsed=false; this.pegs=[]; const layout=(this.stage-1)%3; const cols=[7,8,9][layout], rows=[9,9,10][layout], sideInset=Math.max(34,this.size.x*.06), width=this.size.x-sideInset*2, left=sideInset, top=this.launcher.y-126, bottom=Math.max(this.floorY+112,this.size.y*.145), gapX=width/(cols-1), gapY=(top-bottom)/(rows-1);
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) { const x=left+c*gapX+(r%2?gapX/2:0); if(x>28&&x<this.size.x-28&&!(r===0&&Math.abs(x-this.size.x/2)<gapX*.7)) this.pegs.push({pos:new Vec2(x,top-r*gapY)}); }
    this.pegs.forEach((peg, i) => this.pegColliders.set(i, PhysicsBoardFactory.circle(this.physicsRoot, `Peg_${i}`, peg.pos, this.pegR, i + 1)));
    const specialPositions=[[.24,.47,.76,.57],[.76,.43,.25,.63],[.5,.55,.78,.35]][layout];
    this.resetPeg.set(this.size.x*specialPositions[0], this.size.y*specialPositions[1]); this.bombPeg.set(this.size.x*specialPositions[2], this.size.y*specialPositions[3]);
    PhysicsBoardFactory.circle(this.physicsRoot, 'ResetPeg', this.resetPeg, this.pegR + 3, 201);
    PhysicsBoardFactory.circle(this.physicsRoot, 'BombPeg', this.bombPeg, this.pegR + 3, 202);
    PhysicsBoardFactory.box(this.physicsRoot, 'WallLeft', new Vec2(sideInset-8, this.size.y / 2), new Size(16, this.size.y));
    PhysicsBoardFactory.box(this.physicsRoot, 'WallRight', new Vec2(this.size.x-sideInset+8, this.size.y / 2), new Size(16, this.size.y));
    PhysicsBoardFactory.box(this.physicsRoot, 'WallTop', new Vec2(this.size.x / 2, this.size.y + 8), new Size(this.size.x, 16));
    this.boardVisuals.removeAllChildren(); this.pegVisuals.clear();
    this.pegs.forEach((peg, index) => { const sprite=this.createSprite(this.boardVisuals, 'pin-green-v1', 70); sprite.node.setPosition(peg.pos.x,peg.pos.y); this.pegVisuals.set(index,sprite); });
    this.resetVisual=this.createSprite(this.boardVisuals,'pin-reset-v1',80); this.resetVisual.node.setPosition(this.resetPeg.x,this.resetPeg.y);
    this.bombVisual=this.createSprite(this.boardVisuals,'pin-bomb-v1',80); this.bombVisual.node.setPosition(this.bombPeg.x,this.bombPeg.y);
  }
  private down(e: TouchEventLike) {
    this.pointer.set(e.getUILocation().x,e.getUILocation().y);
    if(this.lobby.visible){this.lobby.handleTap(this.pointer.x,this.pointer.y);return;}
    if(this.flying||this.resolving) return;
    if(this.pointer.x<130&&this.pointer.y>this.size.y-82){this.openLobby();return;}
    if(this.over) { this.stage=1; this.score=0; this.targetScore=100; this.over=false; this.board(); this.tip.string='从顶部向下拖动，松开发射'; return; }
    if(this.pointer.y<this.launcher.y-12) this.aiming=true;
  }
  private move(e: TouchEventLike) { if(this.aiming) this.pointer.set(e.getUILocation().x,e.getUILocation().y); }
  private up(e: TouchEventLike) {
    if(!this.aiming) return; this.pointer.set(e.getUILocation().x,e.getUILocation().y); this.aiming=false; PegSound.unlock();
    const d=this.pointer.clone().subtract(this.launcher); if(d.y>=-35) return; d.normalize();
    this.shotIndex++; this.splitBall=this.shotIndex%5===0; this.splitTriggered=false; this.springBall=!this.splitBall&&this.shotIndex%3===0; this.ballCollider.restitution=this.springBall?1.02:this.retain; this.ballCollider.apply(); this.ball.set(this.launcher); this.ballNode.setPosition(this.launcher.x, this.launcher.y); this.ballNode.active=true; this.cloneNode.active=false; this.ballBody.linearVelocity=d.multiplyScalar(this.speed); this.flying=true; this.tip.string=this.splitBall?'分裂球！首次撞钉后分成两颗':this.springBall?'高弹力球！本次反弹更强':'绿钉 3 分，蓝钉 2 分，灰钉 1 分'; GameTelemetry.track('shot_start', { stage: this.stage, shot: this.shotIndex, ballType: this.splitBall ? 'split' : this.springBall ? 'spring' : 'normal' });
  }
  private onBallContact(self: Collider2D, other: Collider2D) {
    if (!this.flying) return;
    if (other.tag > 0 && other.tag < 100) { this.scorePeg(other.tag - 1); if(this.splitBall&&!this.splitTriggered){this.splitTriggered=true;const body=self.node.getComponent(RigidBody2D)!;const pos=self.node.position;const velocity=body.linearVelocity;this.scheduleOnce(()=>{this.cloneNode.setPosition(pos.x,pos.y);this.cloneNode.active=true;this.cloneBody.linearVelocity=new Vec2(-velocity.x*.72,velocity.y*.9);},0);} }
    if (other.tag === 201) { const nextPosition=new Vec2(55 + Math.random()*(this.size.x-110), this.floorY+105 + Math.random()*(this.size.y-this.floorY-285)); this.hit.clear(); this.tip.string='全盘重置！所有普通钉子恢复绿色'; PegSound.play('reset'); GameTelemetry.track('special_hit', { stage: this.stage, kind: 'reset' }); this.scheduleOnce(() => { this.pegColliders.forEach((collider) => collider.enabled=true); this.resetPeg.set(nextPosition); other.node.setPosition(nextPosition.x,nextPosition.y); other.apply(); }, 0); }
    if (other.tag === 202 && !this.bombUsed) { this.bombUsed=true; other.enabled=false; PegSound.play('bomb'); GameTelemetry.track('special_hit', { stage: this.stage, kind: 'bomb' }); this.pegs.forEach((peg,index)=>{if(peg.pos.clone().subtract(this.bombPeg).length()<115)this.scorePeg(index);}); this.tip.string='爆炸钉子！附近钉子全部触发'; }
  }
  private scorePeg(index:number) { const count=this.hit.get(index)??0; if(count>=this.maxHitsPerPeg)return; const next=count+1, points=[3,2,1][count]; this.hit.set(index,next); this.score+=points; PegSound.play(count===0?'green':count===1?'blue':'gray'); GameTelemetry.track('peg_hit', { stage: this.stage, points, pegState: next, score: this.score }); this.scorePopup(points,this.pegs[index].pos); if(next===this.maxHitsPerPeg)this.pegColliders.get(index)!.enabled=false; this.tip.string=`+${points} 分！当前 ${this.score}/${this.targetScore}`; if(this.score>=this.targetScore)this.levelWon=true; }
  private scorePopup(points:number, position:Vec2) { const node=new Node('ScorePopup'); node.parent=this.root; node.setPosition(position.x,position.y+20); node.addComponent(UITransform).setContentSize(90,50); const label=node.addComponent(Label); label.string=`+${points}`; label.fontSize=30; label.lineHeight=34; label.color=points===3?new Color(255,228,72):points===2?new Color(104,200,255):new Color(225,225,225); label.horizontalAlign=Label.HorizontalAlign.CENTER; const opacity=node.addComponent(UIOpacity); tween(node).to(.32,{position:new Vec3(position.x,position.y+75,0)}).call(()=>node.destroy()).start(); tween(opacity).delay(.14).to(.18,{opacity:0}).start(); }
  private finishShot() {
    if (!this.flying) return;
    this.flying=false; this.ballBody.linearVelocity=Vec2.ZERO; this.ballNode.active=false; this.resolving=true; this.timer=0; GameTelemetry.track('shot_end', { stage: this.stage, shot: this.shotIndex, score: this.score, cleared: this.levelWon });
  }
  private resolve(dt:number) {
    this.timer+=dt;
    if(this.timer<.35) return;
    this.resolving=false;
    if(this.levelWon){const clearedStage=this.stage;const reward=20+clearedStage*5;this.stage++;this.bestStage=Math.max(this.bestStage,this.stage);this.coins+=reward;sys.localStorage.setItem('cow-marble-best-stage',String(this.bestStage));sys.localStorage.setItem('cow-marble-coins',String(this.coins));GameTelemetry.track('level_complete', { stage: clearedStage, nextStage: this.stage, score: this.score, coinsAwarded: reward, coinsTotal: this.coins });this.score=0;this.targetScore=80+this.stage*20;this.levelWon=false;this.board();this.tip.string=`过关！获得 ${reward} 牛币，第 ${this.stage} 关开始`;return;}
    this.tip.string='继续投珠，累计目标分数';
  }
  private openLobby(){this.lobby.show(`最高闯到第 ${this.bestStage} 关 · 牛币 ${this.coins}`);this.tip.string='从大厅点击“开始闯关”进入棋盘';}
  private onLobbyAction(action:LobbyAction){
    if(action==='start'){this.lobby.hide();this.tip.string='从顶部向下拖动，松开发射';GameTelemetry.track('lobby_start_tap');return;}
    if(action==='daily'){const key=new Date().toISOString().slice(0,10);if(sys.localStorage.getItem('cow-marble-daily')===key){this.lobby.showModal('今日已领取','明天再来牧场领取牛币补给吧！');return;}this.coins+=25;sys.localStorage.setItem('cow-marble-coins',String(this.coins));sys.localStorage.setItem('cow-marble-daily',key);GameTelemetry.track('daily_claim',{coins:25,total:this.coins});this.lobby.showModal('补给到账','获得 25 牛币！每天回来都有补给。');return;}
    if(action==='supply'){void this.claimSupply();return;}
    if(action==='notice'){this.lobby.showModal('牧场公告','欢迎来到对牛弹珠！\n绿色、蓝色、灰色牛铃依次得 3、2、1 分。\n撞到特殊钉子会发生惊喜变化。');return;}
    if(action==='guide'){this.lobby.showModal('玩法说明','向下拖动并松开即可发射。\n紫色钉子重置普通钉子；橙色钉子触发附近目标。\n第 3 球高弹力，第 5 球会分裂。');return;}
    if(action==='invite'){this.lobby.showModal('邀请好友','分享入口已预留。接入抖音 AppID 后，可调用平台分享能力邀请好友一起来闯关。');return;}
    this.lobby.showModal('添加到桌面','此入口将在抖音真机环境中调用“添加到桌面”能力；浏览器预览中无需操作。');
  }
  private async claimSupply(){if(!RewardedAdBridge.isConfigured){this.lobby.showModal('免费补给','激励视频广告位尚未配置。接入广告位后，完整观看即可领取 30 牛币。');return;}const rewarded=await RewardedAdBridge.show('lobby_free_supply');if(!rewarded){this.lobby.showModal('暂未领取','广告未完整播放，请稍后再试。');return;}this.coins+=30;sys.localStorage.setItem('cow-marble-coins',String(this.coins));GameTelemetry.track('supply_claim',{coins:30,total:this.coins});this.lobby.showModal('补给到账','获得 30 牛币！');}
  private draw() {
    this.g.clear();this.guide.clear();this.g.fillColor=new Color(12,50,61,28);this.g.rect(0,0,this.size.x,this.size.y);this.g.fill();this.g.fillColor=new Color(255,255,245,92);this.g.roundRect(this.size.x*.15,this.size.y-82,this.size.x*.7,55,28);this.g.fill();
    this.pegs.forEach((p,i)=>{const count=this.hit.get(i)??0;if(count>=this.maxHitsPerPeg)return;this.g.fillColor=count===0?new Color(83,196,112):count===1?new Color(76,151,232):new Color(120,128,143);this.g.circle(p.pos.x,p.pos.y,this.pegR);this.g.fill();});
    this.g.fillColor=new Color(182,92,222);this.g.circle(this.resetPeg.x,this.resetPeg.y,this.pegR+3);this.g.fill();
    if(!this.bombUsed){this.g.fillColor=new Color(244,113,53);this.g.circle(this.bombPeg.x,this.bombPeg.y,this.pegR+3);this.g.fill();}
    this.g.fillColor=new Color(154,211,255);this.g.circle(this.launcher.x,this.launcher.y,18);this.g.fill();
    if(this.flying){this.g.fillColor=this.springBall?new Color(255,109,181):new Color(255,226,105);this.g.circle(this.ball.x,this.ball.y,this.ballR);this.g.fill();}
    if(this.aiming){const d=this.pointer.clone().subtract(this.launcher);d.normalize();this.guide.strokeColor=new Color(255,255,255,180);this.guide.lineWidth=2;this.guide.moveTo(this.launcher.x,this.launcher.y);this.guide.lineTo(this.launcher.x+d.x*150,this.launcher.y+d.y*150);this.guide.stroke();}
    this.hud.string=`第 ${this.stage} 关    积分 ${this.score}/${this.targetScore}    牛币 ${this.coins}    最高 ${this.bestStage} 关`;this.home.node.active=!this.lobby.visible;
    this.pegVisuals.forEach((sprite,index)=>{const count=this.hit.get(index)??0;sprite.node.active=count<this.maxHitsPerPeg;this.setSprite(sprite,count===0?'pin-green-v1':count===1?'pin-blue-v1':'pin-gray-v1');});
    this.resetVisual.node.setPosition(this.resetPeg.x,this.resetPeg.y);
    this.bombVisual.node.active=!this.bombUsed;
    this.launcherVisual.node.setPosition(this.launcher.x,this.launcher.y);
    this.ballVisual.node.active=this.ballNode.active;
    this.setSprite(this.ballVisual,this.springBall?'ball-spring-v1':'ball-standard-v1');
    this.ballVisual.node.setPosition(this.ball.x,this.ball.y);
    this.cloneVisual.node.active=this.cloneNode.active;
    this.cloneVisual.node.setPosition(this.cloneNode.position.x,this.cloneNode.position.y);
  }
  private bar(x:number,y:number,w:number,h:number,r:number,c:Color){this.g.fillColor=new Color(42,50,63);this.g.rect(x,y,w,h);this.g.fill();this.g.fillColor=c;this.g.rect(x+2,y+2,(w-4)*Math.max(0,r),h-4);this.g.fill();}
}
interface TouchEventLike { getUILocation(): {x:number;y:number}; }
