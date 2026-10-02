import {SCENES,RECIPES,INGREDIENTS,TIMING} from './content.js';
import {Kitchen,DIR,itemLabel} from './engine.js';
import {FixedPartner,route} from './partner.js';
import {Renderer,drawFood} from './render.js';
const $=id=>document.getElementById(id), renderer=new Renderer($('kitchen'));
let replay=null;
let kitchen,scene='sushi-city',selected=0,started=false,paused=true,bots,goals=[null,null],queued=[null,null],keys=new Set(),accumulator=0,last=0;
function reset(){replay=null;$('replay-status').textContent='';kitchen=new Kitchen({scene,seed:Number($('seed').value)||42,procedure:$('procedure').checked});bots=[0,1].map(id=>new FixedPartner(id,{style:$('partner').value}));goals=[null,null];queued=[null,null];keys.clear();started=false;paused=true;accumulator=0;renderer.positions=[];update();}
function start(){if(kitchen.done)reset();started=true;paused=false;$('kitchen').focus();update();}
function pause(){if(!started||kitchen.done)return;paused=!paused;keys.clear();update();}
function recipeUI(){const show=$('procedure').checked;$('recipe-hint').textContent=show?'Full recipe steps are visible (oracle mode).':'Names and ingredients only. Work out the steps together.';$('recipe-list').replaceChildren();for(const id of kitchen.spec.menu){const r=RECIPES[id],box=document.createElement('div');box.className='recipe-entry';const title=document.createElement('b');title.textContent=r.name;const p=document.createElement('p');p.textContent=r.ingredients.map(i=>INGREDIENTS[i].name).join(' + ');box.append(title,p);if(show){const steps=document.createElement('p');steps.className='subtle';steps.textContent=r.steps.join(' → ');box.append(steps);}$('recipe-list').append(box);}}
function update(){
 $('scene-tabs').replaceChildren();SCENES.forEach((s,i)=>{const b=document.createElement('button');b.className='scene-tab '+(s.id===scene?'active':'');b.setAttribute('aria-pressed',s.id===scene);b.innerHTML=`<span class="scene-symbol">0${i+1}</span><span><b>${s.name}</b><small>${s.reference} · ${s.roleMode==='fixed'?'Fixed roles':'Flexible roles'}</small></span><span class="scene-num">↗</span>`;b.onclick=()=>{scene=s.id;reset();};$('scene-tabs').append(b);});
 $('score').textContent=kitchen.score;$('served').textContent=kitchen.delivered;const seconds=Math.ceil((kitchen.horizon-kitchen.tick)*TIMING.dt);$('clock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 $('service-state').textContent=kitchen.done?'Service complete':!started?'Ready to open':paused?'On a break':'Now serving';$('service-caption').textContent=kitchen.spec.roleMode==='fixed'?'Assemble left · Cook right':'Shared kitchen · Swap roles freely';$('pause-btn').textContent=paused?'Resume':'Pause';
 $('start-overlay').hidden=started&&!kitchen.done;$('start-overlay').style.display=started&&!kitchen.done?'none':'';
 $('overlay-copy').textContent=kitchen.done?`You served ${kitchen.delivered} orders and earned ${kitchen.score} points.`:kitchen.spec.description;$('start-btn').textContent=kitchen.done?'Play again ↗':'Open the kitchen ↗';
 $('p2-help').textContent=$('mode').value==='local'?'Arrows · Enter · Shift':'Scripted teammate';$('partner').disabled=$('mode').value==='local';
 $('orders').replaceChildren();for(const o of kitchen.orders){const r=RECIPES[o.recipe],card=document.createElement('div');card.className='ticket';card.innerHTML=`<div class="ticket-header"><b>${r.name}</b><small>#${String(o.id).padStart(2,'0')}</small></div><div class="ticket-body"></div><div class="ticket-bar" style="width:${o.remaining/6}%"></div>`;for(const type of r.ingredients){const c=document.createElement('canvas');c.width=72;c.height=60;c.style.width='36px';c.style.height='30px';c.title=INGREDIENTS[type].name;drawFood(c.getContext('2d'),{parts:[{type,stage:'raw'}]},36,33,30);card.querySelector('.ticket-body').append(c);} $('orders').append(card);}
 $('crew').replaceChildren();for(const p of kitchen.players){const line=document.createElement('p');line.className='subtle';line.textContent=`${p.id===selected?'●':'○'} P${p.id+1} · ${itemLabel(p.held)}`;$('crew').append(line);}
 $('event-log').replaceChildren();for(const e of kitchen.events.filter(e=>!['blocked','invalid','pickup','place'].includes(e.type)).slice(-4).reverse()){const line=document.createElement('p');line.className='subtle';line.textContent=`${(e.tick*TIMING.dt).toFixed(0)}s · ${e.message}`;$('event-log').append(line);}recipeUI();
}
function human(id){if(queued[id]){const a=queued[id];queued[id]=null;return a;}
 const map=id===selected&&$('mode').value!=='local'||id===0?{w:'up',d:'right',s:'down',a:'left'}:{ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left'};
 for(const [key,a]of Object.entries(map))if(keys.has(key)){goals[id]=null;return a;}
 if(goals[id]){const target=kitchen.stations.find(s=>s.id===goals[id]);if(!target){goals[id]=null;return 'wait';}const p=kitchen.players[id];const work=!p.held&&((target.type==='chop'&&target.item?.parts[0]?.stage==='raw')||(target.type==='sink'&&target.item?.dirty));const a=route(kitchen.observe(id),id,target,work?'work':'interact');if(a==='interact'||a==='work')goals[id]=null;return a;}return 'wait';
}
function tick(){if(kitchen.done)return;const mode=$('mode').value;const actions=replay?replay.trace[kitchen.tick]?.actions:[0,1].map(id=>mode==='demo'||mode==='buddy'&&id!==selected?bots[id].act(kitchen.observe(id)):human(id));if(!actions){paused=true;$('replay-status').textContent='Replay complete';update();return;}kitchen.step(actions);update();}
function frame(time){const delta=Math.min(.1,(time-last)/1000);last=time;if(started&&!paused&&!kitchen.done){accumulator+=delta;while(accumulator>=TIMING.dt){accumulator-=TIMING.dt;tick();}}renderer.draw(kitchen,{selected,paused:started&&paused,time:time/1000});requestAnimationFrame(frame);}
$('load-replay').onclick=()=>$('replay-file').click();
$('replay-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10_000_000)throw Error('File exceeds 10 MB');const record=JSON.parse(await file.text());if(record.schema!=='overcooked-together/episode-v1'||!Array.isArray(record.trace)||record.trace.length>20000)throw Error('Unsupported recording format');const validation=new Kitchen(record);for(const row of record.trace)validation.step(row.actions);if(JSON.stringify(validation.exportEpisode().final)!==JSON.stringify(record.final))throw Error('Recording does not match the current simulator');scene=record.scene;reset();kitchen=new Kitchen(record);replay=record;$('mode').value='demo';started=true;paused=false;$('replay-status').textContent='Replaying · '+record.trace.length+' steps';update();}catch(err){$('replay-status').textContent='Could not load replay: '+err.message;}e.target.value='';};
$('start-btn').onclick=start;$('demo-btn').onclick=()=>{$('mode').value='demo';start();};$('pause-btn').onclick=pause;$('reset-btn').onclick=reset;$('mode').onchange=reset;$('partner').onchange=reset;
$('procedure').onchange=()=>{kitchen.procedure=$('procedure').checked;update();};
$('help-btn').onclick=()=>{if(started)paused=true;$('help').showModal();update();};for(const id of ['close-help','got-it'])$(id).onclick=()=>$('help').close();
$('export-btn').onclick=()=>{const blob=new Blob([JSON.stringify(kitchen.exportEpisode(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`overcooked-${scene}-${kitchen.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('kitchen').onmousemove=e=>renderer.hover=renderer.stationFromPoint(e.clientX,e.clientY);$('kitchen').onmouseleave=()=>renderer.hover=null;
$('kitchen').onclick=e=>{if(!started||paused||$('mode').value==='demo')return;goals[selected]=renderer.stationFromPoint(e.clientX,e.clientY);$('kitchen').focus();};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('help').open)return;let key=e.key.length===1?e.key.toLowerCase():e.key;
 if(['w','a','s','d','e',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Shift','Tab','p'].includes(key))e.preventDefault();
 if(key==='p'&&!e.repeat){pause();return;}if(key==='Tab'&&!e.repeat){if($('mode').value==='buddy'){selected=1-selected;goals=[null,null];keys.clear();update();}return;}
 if(!started||paused||$('mode').value==='demo')return;keys.add(key);if(!e.repeat){const id=$('mode').value==='local'?0:selected;if(key==='e')queued[id]='interact';if(key===' ')queued[id]='work';if($('mode').value==='local'&&key==='Enter')queued[1]='interact';if($('mode').value==='local'&&key==='Shift')queued[1]='work';}
});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{keys.clear();if(started){paused=true;update();}});
// Developer/evaluator interface; policies receive Kitchen.observe(), never this object.
window.kitchenApp={get engine(){return kitchen;},reset,start,tick,selectScene(id){if(!SCENES.some(s=>s.id===id))throw Error('Unknown scene');scene=id;reset();}};
reset();requestAnimationFrame(frame);
