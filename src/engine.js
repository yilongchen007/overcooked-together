import {SCENES,RECIPES,INGREDIENTS,STATIONS,TIMING} from './content.js';
export const ACTIONS=Object.freeze(['wait','up','right','down','left','interact','work']);
export const DIR={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const clone=x=>structuredClone(x);
const signature=parts=>parts.map(p=>p.type+':'+p.stage).sort().join('|');
export function readyParts(item,recipe){return !!item&&signature(item.parts)===signature(recipe.parts.map(([type,stage])=>({type,stage})));}
export function complete(item,recipe){return readyParts(item,recipe)&&(!recipe.bake||item.baked)&&item.plate&&!item.dirty&&!item.burnt;}
export function itemLabel(item){if(!item)return 'Empty hands';if(item.dirty)return 'Dirty plate';if(item.burnt)return 'Burnt food';if(!item.parts.length)return 'Empty plate';
 let names=item.parts.map(p=>(p.stage==='chopped'?(p.type==='dough'?'Rolled ':'Chopped '):p.stage==='cooked'?'Cooked ':'')+INGREDIENTS[p.type].name).join(' + ');
 if(item.baked)names='Baked Pizza';return names+(item.plate?' · Plated':'');}
export class Kitchen {
 constructor({scene='sushi-city',seed=42,procedure=false,horizon=1500,menu,roleMode,swapSeats=false}={}){
  const spec=SCENES.find(s=>s.id===scene);if(!spec)throw Error('Unknown scene');
  if(!Number.isInteger(horizon)||horizon<1)throw Error('horizon must be a positive integer');
  if(roleMode&&!['fixed','flexible'].includes(roleMode))throw Error('Invalid role mode');
  if(roleMode==='fixed'&&scene!=='burger-mine')throw Error('Only burger-mine supports fixed geometry');
  this.spec=clone(spec);this.spec.roleMode=roleMode??spec.roleMode;this.swapSeats=swapSeats;
  if(this.spec.roleMode==='flexible')this.spec.stations=this.spec.stations.filter(s=>!s.divider);this.seed=seed>>>0;this.rng=this.seed||1;this.procedure=procedure;this.horizon=horizon;this.menu=menu??spec.menu;
  if(!this.menu.length||this.menu.some(id=>!spec.menu.includes(id)))throw Error('Menu must be supported by the scene');
  this.tick=0;this.score=0;this.delivered=0;this.failed=0;this.done=false;this.nextItem=1;this.nextOrder=1;this.events=[];this.trace=[];this.returnQueue=[];
  this.stations=this.spec.stations.map(s=>({...clone(s),item:null,progress:0,cook:0,over:0,burning:false,plates:s.type==='plates'?4:0}));
  this.players=(swapSeats?[...spec.spawns].reverse():spec.spawns).map(([x,y],id)=>({id,x,y,dir:id?'left':'right',held:null,work:null,lastMessage:'Ready to cook',busyTicks:0}));
  this.orders=Array.from({length:3},()=>this.newOrder());this.motionPhase=0;
 }
 random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296;}
 newOrder(){const recipe=this.menu[Math.floor(this.random()*this.menu.length)];return {id:this.nextOrder++,recipe,remaining:600};}
 makeFood(type){if(!INGREDIENTS[type])throw Error('Unknown ingredient');return {id:this.nextItem++,parts:[{type,stage:'raw'}],plate:false,baked:false,dirty:false};}
 makePlate(dirty=false){return {id:this.nextItem++,parts:[],plate:true,baked:false,dirty};}
 stationAt(x,y){return this.stations.find(s=>s.x===x&&s.y===y);}
 walkable(x,y){return x>=0&&y>=0&&x<this.spec.width&&y<this.spec.height&&!this.stationAt(x,y);}
 facing(player){const [dx,dy]=DIR[player.dir];return this.stationAt(player.x+dx,player.y+dy);}
 event(type,player,message,extra={}){const e={tick:this.tick,type,player,message,...extra};this.events.push(e);if(this.events.length>80)this.events.shift();if(player!=null)this.players[player].lastMessage=message;return e;}
 merge(a,b){if(a.dirty||b.dirty||a.burnt||b.burnt)return null;
  if((a.plate&&b.plate)||a.baked||b.baked){
   if(a.baked&&b.plate&&!b.parts.length&&!b.dirty&&!a.plate)return {...a,plate:true};
   if(b.baked&&a.plate&&!a.parts.length&&!a.dirty&&!b.plate)return {...b,plate:true};
   return null;
  }
  const parts=[...a.parts,...b.parts];if(parts.length>4)return null;
  // Physical assembly uses the global recipe vocabulary, never the active order.
  const counts=signature(parts).split('|');const legal=!parts.length||Object.values(RECIPES).some(r=>{
   const remaining=r.parts.map(([t,s])=>t+':'+s);return counts.every(c=>{const i=remaining.indexOf(c);if(i<0)return false;remaining.splice(i,1);return true;});
  });
  if(!legal)return null;return {id:Math.min(a.id,b.id),parts,plate:a.plate||b.plate,baked:false,dirty:false};
 }
 step(actions=['wait','wait']){
  if(this.done)return this.result(0);
  if(!Array.isArray(actions)||actions.length!==2||actions.some(a=>!ACTIONS.includes(a)))throw Error('Expected two primitive actions');
  const scoreBefore=this.score;this.tick++;
  const targets=this.players.map((p,i)=>{const d=DIR[actions[i]];if(!d)return [p.x,p.y];p.dir=actions[i];p.work=null;return this.walkable(p.x+d[0],p.y+d[1])?[p.x+d[0],p.y+d[1]]:[p.x,p.y];});
  const same=targets[0][0]===targets[1][0]&&targets[0][1]===targets[1][1];
  const swap=targets.every((t,i)=>t[0]===this.players[1-i].x&&t[1]===this.players[1-i].y);
  if(!same&&!swap)targets.forEach(([x,y],i)=>Object.assign(this.players[i],{x,y}));
  else if(actions.some(a=>DIR[a]))this.event('blocked',null,'The chefs are blocking each other');
  for(const i of [this.tick%2,1-this.tick%2]){if(actions[i]==='interact')this.interact(i);if(actions[i]==='work')this.work(i);}
  this.advanceWork();this.advanceHeat();this.advanceMotion();
  this.returnQueue=this.returnQueue.filter(r=>{if(r.at>this.tick)return true;const st=this.stations.find(s=>s.type==='returns');st.plates++;return false;});
  this.orders.forEach(o=>o.remaining--);const expired=this.orders.filter(o=>o.remaining<=0);for(const o of expired){this.failed++;this.event('expired',null,'Order expired',{recipe:o.recipe});}
  this.orders=this.orders.filter(o=>o.remaining>0);while(this.orders.length<3)this.orders.push(this.newOrder());
  this.done=this.tick>=this.horizon;
  this.trace.push({tick:this.tick,actions:[...actions],reward:this.score-scoreBefore,score:this.score});
  return this.result(this.score-scoreBefore);
 }
 result(reward){return {observations:this.players.map(p=>this.observe(p.id)),reward,done:this.done,info:{delivered:this.delivered,failed:this.failed,tick:this.tick}};}
 interact(id){const p=this.players[id],st=this.facing(p);p.work=null;if(!st)return;
  const h=p.held;
  if(st.type==='supply'){if(!h){p.held=this.makeFood(st.ingredient);this.event('pickup',id,'Picked up '+INGREDIENTS[st.ingredient].name);}return;}
  if(st.type==='plates'||st.type==='returns'){if(!h&&st.plates>0){st.plates--;p.held=this.makePlate(st.type==='returns'&&this.spec.dirtyPlates);this.event('pickup',id,p.held.dirty?'Picked up a dirty plate':'Picked up a plate');}return;}
  if(st.type==='serve'){if(!h)return;const order=this.orders.find(o=>complete(h,RECIPES[o.recipe]));
   if(!order){this.event('invalid',id,'This dish is not ready to serve');return;}
   this.score+=RECIPES[order.recipe].value;this.delivered++;this.orders=this.orders.filter(o=>o!==order);this.returnQueue.push({at:this.tick+TIMING.return});p.held=null;
   this.event('serve',id,'Served '+RECIPES[order.recipe].name,{recipe:order.recipe});return;}
  if(st.type==='trash'){if(h){if(h.plate){h.parts=[];h.burnt=false;h.baked=false;h.dirty=true;}else p.held=null;this.event('discard',id,'Discarded food');}return;}
  if(st.type==='wall')return;
  const heated=['pot','pan','oven'].includes(st.type);
  if(heated){
   if(st.burning){this.event('invalid',id,'The food is burnt. Pick it up and discard it.');}
   if(!h&&st.item&&(!st.cook||st.over>0||st.item.burnt)){p.held=st.item;st.item=null;st.cook=0;st.over=0;st.burning=false;this.event('pickup',id,'Removed '+itemLabel(p.held));return;}
   if(h?.plate&&!h.parts.length&&!h.dirty&&st.item&&st.over>0){const merged=this.merge(h,st.item);if(merged){p.held=merged;st.item=null;st.over=0;st.cook=0;this.event('pickup',id,'Plated food');}return;}
   if(h&&!st.item){const part=h.parts[0];const valid=!h.plate&&!h.dirty&&!h.burnt&&(
    st.type==='pot'&&h.parts.length===1&&part.type==='rice'&&part.stage==='raw'||
    st.type==='pan'&&h.parts.length===1&&part.type==='beef'&&part.stage==='chopped'||
    st.type==='oven'&&Object.values(RECIPES).some(r=>r.bake&&readyParts(h,r))&&!h.baked);
    if(valid){st.item=h;p.held=null;st.cook=st.type==='oven'?TIMING.bake:TIMING.cook;st.total=st.cook;st.over=0;this.event('heat',id,'Started '+(st.type==='pot'?'boiling rice':st.type==='pan'?'frying beef':'baking'));}
    else this.event('invalid',id,'This item cannot go in this station');
   }return;
  }
  if(!h&&st.item){p.held=st.item;st.item=null;st.progress=0;this.event('pickup',id,'Picked up '+itemLabel(p.held));return;}
  if(h&&!st.item){if(st.type==='sink'&&(!h.plate||!h.dirty))return;st.item=h;p.held=null;st.progress=0;this.event('place',id,'Placed '+itemLabel(h));return;}
  if(h&&st.item&&st.type!=='sink'){const merged=this.merge(st.item,h);if(merged){st.item=merged;p.held=null;this.event('assemble',id,'Combined ingredients');}else this.event('invalid',id,'These items cannot be combined');}
 }
 work(id){const p=this.players[id],st=this.facing(p);if(!st||p.held||!st.item)return;
  if(st.type==='chop'&&st.item.parts.length===1&&!st.item.plate&&st.item.parts[0].stage==='raw'&&['fish','beef','cheese','dough','tomato'].includes(st.item.parts[0].type))p.work=st.id;
  if(st.type==='sink'&&st.item.dirty)p.work=st.id;
 }
 advanceWork(){const advanced=new Set();for(const p of this.players){if(!p.work)continue;const st=this.facing(p);if(st?.id!==p.work||!st.item){p.work=null;continue;}
   if(advanced.has(st.id))continue;advanced.add(st.id);
   if(st.type==='chop'&&st.item.parts[0]?.stage!=='raw'||st.type==='sink'&&!st.item.dirty){p.work=null;continue;}
   st.progress++;const total=st.type==='sink'?TIMING.wash:TIMING.chop;
   if(st.progress>=total){if(st.type==='sink')st.item.dirty=false;else st.item.parts[0].stage='chopped';st.progress=0;p.work=null;this.event('processed',p.id,st.type==='sink'?'Plate washed':'Ingredient prepared');}
  }}
 advanceHeat(){for(const st of this.stations){if(!st.item)continue;if(st.cook>0){st.cook--;if(st.cook===0){if(st.type==='oven')st.item.baked=true;else st.item.parts[0].stage='cooked';st.over=1;this.event('ready',null,STATIONS[st.type]+' is ready to collect');}}
  else if(st.over>0&&!st.item.burnt){st.over++;if(st.over>TIMING.burn){st.item.burnt=true;st.burning=true;this.event('burnt',null,'Food burnt');}}
 }}
 advanceMotion(){const m=this.spec.motion;if(!m||this.tick%m.every)return;
  let positions;if(m.kind==='rotate'){this.motionPhase=(this.motionPhase+1)%m.slots.length;positions=m.ids.map((_,i)=>m.slots[(i+this.motionPhase)%m.slots.length]);}
  else {const next=this.motionPhase?0:1;positions=next?m.b:m.a;
   // Delay a move when its destination is occupied; never teleport a chef.
   if(positions.some(([x,y])=>this.players.some(p=>p.x===x&&p.y===y)))return;this.motionPhase=next;
  }
  m.ids.forEach((id,i)=>Object.assign(this.stations.find(s=>s.id===id),{x:positions[i][0],y:positions[i][1]}));
  this.event('motion',null,m.kind==='rotate'?'The turntable moved':'The preparation boards changed sides');
 }
 observe(id,{procedure=this.procedure}={}){
  if(id!==0&&id!==1)throw Error('Unknown player');
  const obs={scene:this.spec.id,roleMode:this.spec.roleMode,horizon:this.horizon,motion:clone(this.spec.motion),motionPhase:this.motionPhase,returnQueue:clone(this.returnQueue),tick:this.tick,dt:TIMING.dt,playerId:id,width:this.spec.width,height:this.spec.height,score:this.score,done:this.done,
   players:clone(this.players.map(({lastMessage,busyTicks,...p})=>p)),
   stations:clone(this.stations.map(({total,...st})=>st)),
   orders:this.orders.map(o=>({id:o.id,name:RECIPES[o.recipe].name,recipe:o.recipe,ingredients:[...RECIPES[o.recipe].ingredients],remaining:o.remaining})),
   actions:[...ACTIONS]};
  if(procedure)obs.procedures=Object.fromEntries(this.orders.map(o=>[o.recipe,this.oracleProcedure(o.recipe)]));
  return obs;
 }
 oracleProcedure(recipe){const r=RECIPES[recipe];if(!r)throw Error('Unknown recipe');return clone({parts:r.parts,bake:r.bake,steps:r.steps});}
 exportEpisode(){return {schema:'overcooked-together/episode-v1',version:'0.1.0',scene:this.spec.id,seed:this.seed,horizon:this.horizon,roleMode:this.spec.roleMode,swapSeats:this.swapSeats,menu:[...this.menu],procedure:this.procedure,trace:clone(this.trace),final:{score:this.score,delivered:this.delivered,failed:this.failed,tick:this.tick}};}
}
