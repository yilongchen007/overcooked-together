// Fixed, rule-based expert for playing/debugging. Not a trained AHT result.
// Reads the same physical observation as other players; recipe knowledge is explicit.
import {RECIPES} from './content.js';
import {DIR,readyParts,complete} from './engine.js';
const distance=(p,s)=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y);
export function route(obs,id,target,terminal='interact'){
 const p=obs.players[id],blocked=new Set(obs.stations.map(s=>`${s.x},${s.y}`));
 const partner=obs.players[1-id];blocked.add(`${partner.x},${partner.y}`);
 if(distance(p,target)===1){const dir=Object.keys(DIR).find(k=>p.x+DIR[k][0]===target.x&&p.y+DIR[k][1]===target.y);return p.dir===dir?terminal:dir;}
 const queue=[[p.x,p.y,null]],seen=new Set([`${p.x},${p.y}`]);
 for(let at=0;at<queue.length;at++){const [x,y,first]=queue[at];
  if(Math.abs(x-target.x)+Math.abs(y-target.y)===1)return first||'wait';
  for(const [a,[dx,dy]]of Object.entries(DIR)){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
   if(nx<0||ny<0||nx>=obs.width||ny>=obs.height||blocked.has(key)||seen.has(key))continue;seen.add(key);queue.push([nx,ny,first||a]);}
 }
 const closer=queue.filter(q=>q[2]&&Math.abs(q[0]-target.x)+Math.abs(q[1]-target.y)<distance(p,target)).sort((a,b)=>(Math.abs(a[0]-target.x)+Math.abs(a[1]-target.y))-(Math.abs(b[0]-target.x)+Math.abs(b[1]-target.y)))[0];
 return closer?.[2]||'wait';
}
export class FixedPartner {
 constructor(id,{style='balanced'}={}){this.id=id;this.style=style;this.lastTarget=null;}
 act(obs){
  const p=obs.players[this.id], key=`${p.x},${p.y}`, action=this.plan(obs);
  this.stuck=key===this.lastPosition?(this.stuck||0)+1:0;this.lastPosition=key;
  if(this.stuck>4+this.id*3&&(DIR[action]||action==='wait')&&!p.work){
   const choices=Object.entries(DIR).filter(([a,[dx,dy]])=>!obs.stations.some(s=>s.x===p.x+dx&&s.y===p.y+dy)&&!obs.players.some(q=>q.id!==this.id&&q.x===p.x+dx&&q.y===p.y+dy)&&p.x+dx>=0&&p.y+dy>=0&&p.x+dx<obs.width&&p.y+dy<obs.height);
   if(choices.length){this.stuck=0;return choices[(Math.floor(obs.tick/5)+this.id)%choices.length][0];}
  }
  return action;
 }
 meatStation(obs){
  const p=obs.players[this.id],h=p.held,ss=obs.stations.filter(s=>s.x>6);
  const near=xs=>xs.sort((a,b)=>distance(p,a)-distance(p,b))[0];
  const go=(s,a='interact')=>s?route(obs,this.id,s,a):'wait';
  const empty=t=>near(ss.filter(s=>s.type===t&&!s.item));
  if(h){
   if(h.burnt)return go(ss.find(s=>s.type==='trash'));
   const part=h.parts[0];
   if(part?.stage==='raw')return go(empty('chop'));
   if(part?.stage==='chopped')return go(empty('pan'));
   return go(near(ss.filter(s=>s.id.startsWith('turn')&&!s.item)));
  }
  const cooked=ss.find(s=>s.type==='pan'&&s.item&&s.over>0);if(cooked)return go(cooked);
  const board=ss.find(s=>s.type==='chop'&&s.item);if(board)return go(board,board.item.parts[0].stage==='raw'?'work':'interact');
  const stock=obs.stations.filter(s=>s.item?.parts.some(q=>q.type==='beef')).length;
  if(stock>=3||!empty('pan'))return 'wait';
  return go(ss.find(s=>s.ingredient==='beef'));
 }
 plan(obs){
  const p=obs.players[this.id],h=p.held,r=RECIPES[obs.orders[0]?.recipe];if(!r)return 'wait';
  const all=obs.stations;
  if(obs.roleMode==='fixed'&&p.x>6)return this.meatStation(obs);
  const stations=obs.roleMode==='fixed'?all.filter(s=>s.x<6):all,assembly=stations.find(s=>s.id==='assembly');
  const near=xs=>xs.sort((a,b)=>distance(p,a)-distance(p,b))[0];
  const go=(s,a='interact')=>{if(!s)return 'wait';this.lastTarget=s.id;return route(obs,this.id,s,a);};
  const ofType=t=>near(stations.filter(s=>s.type===t));
  const empty=t=>near(stations.filter(s=>s.type===t&&!s.item));
  const drop=()=>go(near(stations.filter(s=>s.type==='counter'&&s.id!=='assembly'&&!s.item&&!s.id.startsWith('turn'))));
  const desired=part=>r.parts.find(([t])=>t===part.type)?.[1];
  const compatible=item=>item&&!item.dirty&&!item.burnt&&item.parts.every(part=>r.parts.some(([t,st])=>t===part.type&&(st===part.stage||st==='cooked'&&part.stage!=='cooked')));
  const ready=item=>item&&item.parts.every(part=>desired(part)===part.stage);
  const plateSource=()=>near(stations.filter(s=>((s.type==='plates'||s.type==='returns'&&!obs.stations.some(t=>t.type==='sink'&&t.item?.dirty))&&s.plates>0)||s.item?.plate&&!s.item.parts.length&&!s.item.dirty));
  if(h){
   if(complete(h,r))return go(ofType('serve'));
   if(h.burnt)return go(ofType('trash'));
   if(h.dirty)return empty('sink')?go(empty('sink')):drop();
   if(h.plate&&!h.parts.length){
    const cooked=near(stations.filter(s=>s.type==='oven'&&s.item?.baked&&!s.item.burnt));if(cooked)return go(cooked);
    const platedTarget=near(stations.filter(s=>s.item&&!s.item.plate&&readyParts(s.item,r)&&(!r.bake||s.item.baked)));if(platedTarget)return go(platedTarget);
    if(!r.bake&&assembly.item&&!assembly.item.plate&&ready(assembly.item))return go(assembly);
    return drop();
   }
   if(r.bake&&readyParts(h,r)&&!h.baked&&!h.plate)return go(empty('oven'));
   if(h.parts.length===1&&!h.plate){const part=h.parts[0];
    if(part.stage==='raw'&&['fish','beef','cheese','dough','tomato'].includes(part.type))return go(empty('chop'));
    if(part.type==='rice'&&part.stage==='raw')return go(empty('pot'));
    if(part.type==='beef'&&part.stage==='chopped')return go(empty('pan'));
   }
   const shared=assembly.item;
   if(!shared||(!shared.plate||!h.plate)&&!shared.parts.some(a=>h.parts.some(b=>a.type===b.type)))return go(assembly);
   return drop();
  }
  // Complete dishes and urgent hot food have priority over new preparation.
  const done=near(stations.filter(s=>complete(s.item,r)));if(done)return go(done);
  const hot=near(stations.filter(s=>s.item&&!s.item.burnt&&s.over>0));if(hot)return go(hot);
  const unplated=near(stations.filter(s=>s.item&&!s.item.plate&&readyParts(s.item,r)&&(!r.bake||s.item.baked)));
  if(unplated){const source=plateSource();if(source)return go(source);}
  if(readyParts(assembly.item,r)){
   if(r.bake&&!assembly.item.baked)return go(assembly);
   if(!assembly.item.plate){const ps=plateSource();if(ps)return go(ps);}
  }
  const clean=near(stations.filter(s=>s.type==='sink'&&s.item&&!s.item.dirty));
  if(clean)return go(clean);
  const wash=near(stations.filter(s=>s.type==='sink'&&s.item?.dirty));if(wash)return go(wash,'work');
  const dirty=near(stations.filter(s=>s.item?.dirty));if(dirty&&empty('sink'))return go(dirty);
  // Agent-specific preferences give different fixed coordination conventions.
  const ingredients=r.parts.map(([type,stage],i)=>({type,stage,priority:(i+this.id+(this.style==='prep-first'?1:0))%r.parts.length})).sort((a,b)=>a.priority-b.priority);
  for(const goal of ingredients){
   if(assembly.item?.parts.some(q=>q.type===goal.type))continue;
   if(obs.players.some(v=>v.id!==this.id&&v.held?.parts.some(q=>q.type===goal.type)))continue;
   const existing=stations.filter(s=>s.id!=='assembly'&&s.item&&!s.item.burnt&&s.item.parts.length===1&&s.item.parts[0].type===goal.type);
   const st=near(existing);
   if(st){if(st.cook>0)continue;
    if(st.type==='chop'&&st.item.parts[0].stage==='raw')return go(st,'work');
    return go(st);
   }
   const supply=stations.find(s=>s.type==='supply'&&s.ingredient===goal.type);if(supply)return go(supply);
  }
  if(!plateSource()){const ret=stations.find(s=>s.type==='returns'&&s.plates>0);if(ret)return go(ret);}
  // Move aside when a narrow route has another chef immediately behind us.
  if(obs.tick%8===this.id){const a=Object.keys(DIR)[Math.floor(obs.tick/8)%4];const [dx,dy]=DIR[a];if(!stations.some(s=>s.x===p.x+dx&&s.y===p.y+dy)&&distance(p,obs.players[1-this.id])===1)return a;}
  return 'wait';
 }
}
