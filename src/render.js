import {INGREDIENTS,STATIONS,TIMING} from './content.js';
const COLORS={jade:{floor:['#e6eee4','#dce8df'],edge:'#689185',ground:'#244d48',trim:'#aacdc1',decor:'#507e6e'},amber:{floor:['#e8d9bf','#e0cdb0'],edge:'#987655',ground:'#40352f',trim:'#d8b985',decor:'#745b47'},violet:{floor:['#e3dfe9','#d7d2e2'],edge:'#827991',ground:'#35364c',trim:'#b7accb',decor:'#635975'}};
function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function line(c,x,y,x2,y2,color,width=2){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function drawFood(c,item,x,y,size=26){
 if(!item)return;c.save();c.translate(x,y);c.scale(size/26,size/26);
 if(item.plate){ellipse(c,1,5,22,11,'#00000020');ellipse(c,0,1,23,12,item.dirty?'#c9c5b4':'#f9fbfa');ellipse(c,0,0,18,8,item.dirty?'#b9a58b':'#d9e7e5');ellipse(c,0,-1,16,7,item.dirty?'#c7b499':'#ffffff');}
 if(item.dirty){ellipse(c,4,-1,5,2,'#937a57');ellipse(c,-7,2,3,2,'#937a57');c.restore();return;}
 const parts=item.parts??[],types=parts.map(p=>p.type);
 if(item.burnt){ellipse(c,0,-1,18,10,'#35312d');for(let i=0;i<4;i++)line(c,-10+i*6,-6,-6+i*6,3,'#51453a',2);c.restore();return;}
 if(types.includes('dough')&&parts.length>1){ellipse(c,0,1,21,13,item.baked?'#c38a44':'#d8b98b');ellipse(c,0,-2,20,12,'#f1d095');ellipse(c,0,-3,16,9,types.includes('tomato')?'#d96a48':'#efdcad');if(types.includes('cheese')){ellipse(c,0,-3,14,8,'#f2cf62');for(const [a,b]of [[-7,-5],[6,-6],[0,1],[9,0],[-9,0]])ellipse(c,a,b,3,2,'#da7750');}c.restore();return;}
 if(types.includes('bun')&&parts.length>1){ellipse(c,0,5,20,8,'#c88943');rr(c,-19,-1,38,6,3,'#764435');if(types.includes('cheese')){c.fillStyle='#f9d95f';c.beginPath();c.moveTo(-20,-2);c.lineTo(20,-2);c.lineTo(12,4);c.lineTo(-12,1);c.fill();}ellipse(c,0,-6,20,11,'#eab875');for(let i=0;i<5;i++)ellipse(c,-10+i*5,-9+(i%2)*3,1.5,.7,'#fff1c3');c.restore();return;}
 if(types.includes('fish')&&types.includes('rice')&&types.includes('nori')){for(let i=0;i<3;i++){rr(c,-20+i*14,-8,12,19,4,'#2d5442');ellipse(c,-14+i*14,-7,6,4,'#fff6df');ellipse(c,-14+i*14,-7,3,2,'#ed8c76');}c.restore();return;}
 if(parts.length>1){parts.forEach((p,i)=>drawFood(c,{parts:[p]},(i-(parts.length-1)/2)*15,-3,17));c.restore();return;}
 const p=parts[0];if(!p){c.restore();return;}const info=INGREDIENTS[p.type];const chopped=p.stage==='chopped';
 if(chopped&&p.type!=='dough'){for(const [i,[a,b]]of [[0,[-10,-5]],[1,[2,-7]],[2,[-4,3]],[3,[8,1]]]){rr(c,a-4,b-4,10,7,2,info.color);line(c,a-2,b-3,a+3,b-3,'#ffffff65',1.5);}c.restore();return;}
 switch(p.type){
  case 'fish':ellipse(c,-1,-2,17,9,'#e98678');c.fillStyle='#d96d60';c.beginPath();c.moveTo(11,-2);c.lineTo(24,-10);c.lineTo(24,6);c.fill();ellipse(c,-10,-5,2,2,'#333f3c');line(c,-1,-8,-4,4,'#f6c5a3',3);break;
  case 'rice':if(p.stage==='cooked'){ellipse(c,0,-2,17,10,'#fffbed');for(let i=0;i<8;i++)ellipse(c,-10+(i%4)*6,-6+Math.floor(i/4)*6,3,1.4,'#e9dfc4');}else{rr(c,-12,-17,24,31,4,'#dfc69a');rr(c,-10,-12,20,21,3,'#fff5dc');ellipse(c,0,-2,6,4,'#b8c797');}break;
  case 'nori':rr(c,-16,-12,32,25,2,'#304f40');for(let i=0;i<4;i++)line(c,-14,-8+i*5,14,-8+i*5,'#517057',1);break;
  case 'beef':ellipse(c,0,-2,19,12,p.stage==='cooked'?'#935a3d':'#bc625d');if(p.stage==='cooked'){for(let i=0;i<3;i++)line(c,-11+i*8,-8,-8+i*8,5,'#613e2b',2);}else{ellipse(c,1,-3,11,6,'#d5887b');line(c,-8,-7,6,4,'#f4bfaa',3);}break;
  case 'bun':ellipse(c,0,3,20,10,'#c68a43');ellipse(c,0,-3,20,13,'#e6b46a');for(let i=0;i<5;i++)ellipse(c,-10+i*5,-6+(i%2)*4,1.5,.8,'#fff0bf');break;
  case 'cheese':c.fillStyle='#e5ad37';c.beginPath();c.moveTo(-18,7);c.lineTo(18,7);c.lineTo(18,-7);c.lineTo(-18,-7);c.fill();c.fillStyle='#f6d16a';c.beginPath();c.moveTo(-18,-7);c.lineTo(8,-18);c.lineTo(18,-7);c.closePath();c.fill();ellipse(c,-5,0,3,2,'#cc9233');ellipse(c,10,3,2,2,'#cc9233');break;
  case 'dough':ellipse(c,0,0,chopped?22:17,chopped?9:14,'#e8cba0');ellipse(c,-4,-5,9,4,'#f6e2bc');break;
  case 'tomato':ellipse(c,0,0,15,13,'#e5654c');ellipse(c,-5,-5,4,3,'#f49e7d');c.fillStyle='#56835c';c.beginPath();c.moveTo(0,-8);c.lineTo(-10,-14);c.lineTo(-2,-13);c.lineTo(1,-19);c.lineTo(4,-12);c.lineTo(11,-13);c.closePath();c.fill();break;
 }
 c.restore();
}
export class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.positions=[];this.hit=[];this.hover=null;this.labels=true;}
 geometry(k){const W=1200,H=750,t=69,th=53;return {W,H,t,th,ox:(W-k.spec.width*t)/2,oy:135};}
 draw(k,{selected=0,paused=false,time=0}={}){
  const c=this.ctx,{W,H,t,th,ox,oy}=this.geometry(k),palette=COLORS[k.spec.theme];
  if(this.canvas.width!==W){this.canvas.width=W;this.canvas.height=H;}c.clearRect(0,0,W,H);
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,palette.ground);bg.addColorStop(1,'#1d3333');c.fillStyle=bg;c.fillRect(0,0,W,H);
  // A quiet backdrop, lanterns and plants make the kitchen read as a place.
  for(let i=0;i<36;i++){const x=(i*173+40)%W,y=(i*137+40)%H;ellipse(c,x,y,2,2,'#ffffff0b');}
  c.fillStyle='#ffffffa8';c.font='600 13px system-ui';c.textAlign='left';c.fillText('THE KITCHEN / '+k.spec.english.toUpperCase(),ox,64);
  c.textAlign='right';c.fillStyle='#ffffff65';c.font='12px system-ui';c.fillText(k.spec.reference+' · Adapted layout',W-ox,64);
  for(const x of [ox-49,W-ox+49]){this.plant(c,x,oy+210,palette);this.lamp(c,x,oy+20,time);}
  const bw=k.spec.width*t,bh=k.spec.height*th;
  rr(c,ox-13,oy-10,bw+26,bh+53,15,'#10272455');rr(c,ox-7,oy-7,bw+14,bh+36,12,palette.edge);
  rr(c,ox-2,oy-4,bw+4,bh+6,9,palette.trim);
  for(let y=0;y<k.spec.height;y++)for(let x=0;x<k.spec.width;x++){
   const px=ox+x*t,py=oy+y*th;rr(c,px+1,py+1,t-2,th-2,2,palette.floor[(x+y)%2]);
   if((x*3+y)%7===0)line(c,px+10,py+th-9,px+23,py+th-9,'#ffffff40',1);
  }
  if(k.spec.motion){const m=k.spec.motion;const centerX=ox+6.5*t,centerY=oy+4.5*th;
   if(m.kind==='rotate'){ellipse(c,centerX,centerY,1.95*t,1.85*th,'#77593a22');c.strokeStyle='#a57c4c60';c.setLineDash([5,7]);c.beginPath();c.ellipse(centerX,centerY,1.9*t,1.8*th,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}
   else{line(c,ox+4.5*t,oy+2.7*th,ox+8.5*t,oy+2.7*th,'#9685ad33',5);line(c,ox+4.5*t,oy+4.3*th,ox+8.5*t,oy+4.3*th,'#9685ad33',5);}
  }
  this.hit=[];
  // Sort by floor row for sensible overlap between characters and tall counters.
  const elements=[...k.stations.map(s=>({kind:'station',y:s.y+.5,s})),...k.players.map(p=>({kind:'chef',y:p.y+.8,p}))].sort((a,b)=>a.y-b.y);
  for(const el of elements){if(el.kind==='station')this.station(c,el.s,k,ox+el.s.x*t,oy+el.s.y*th,t,th,time);else{
    const p=el.p,old=this.positions[p.id]??{x:p.x,y:p.y};old.x+=(p.x-old.x)*.24;old.y+=(p.y-old.y)*.24;this.positions[p.id]=old;
    this.chef(c,p,ox+(old.x+.5)*t,oy+(old.y+.62)*th,p.id===selected,time,!!p.work);}}
  if(this.hover){const s=k.stations.find(s=>s.id===this.hover);if(s){const px=ox+s.x*t,py=oy+s.y*th;rr(c,px+1,py-14,t-2,th+9,7,null,'#fff8bc');}}
  const facing=k.facing(k.players[selected]);if(facing){const x=ox+(facing.x+.5)*t,y=oy+facing.y*th-38;c.font='bold 12px system-ui';const name=facing.type==='supply'?INGREDIENTS[facing.ingredient].name:STATIONS[facing.type];const w=c.measureText(name).width+24;rr(c,x-w/2,y-14,w,25,9,'#fdf7e8');c.textAlign='center';c.fillStyle='#334c44';c.fillText(name,x,y+3);}
  c.textAlign='center';c.fillStyle='#e5efe5b0';c.font='13px system-ui';c.fillText(paused?'Kitchen paused · Press P to resume':'Click a station to walk over  ·  E to pick up / place  ·  Space to work',W/2,691);
 }
 station(c,s,k,x,y,t,h,time){
  const hovered=s.id===this.hover;
  rr(c,x+4,y+4,t-8,h+4,5,'#33413935');
  if(s.type==='wall'){rr(c,x+2,y-11,t-4,h+20,5,'#695b49');rr(c,x+4,y-14,t-8,h-4,4,'#a8936f');return;}
  const isSupply=s.type==='supply',top=isSupply?'#bd9360':['pan','pot','sink','oven'].includes(s.type)?'#bfc9c5':'#d4af79';
  rr(c,x+2,y-5,t-4,h+14,5,isSupply?'#846440':'#967448');rr(c,x+3,y-16,t-6,h+5,5,top);
  line(c,x+8,y+3,x+t-8,y+3,'#ffffff15',1);
  if(isSupply){rr(c,x+9,y-9,t-18,h-12,3,'#9d794e');line(c,x+10,y+6,x+t-10,y+6,'#785c3d',2);drawFood(c,{parts:[{type:s.ingredient,stage:'raw'}]},x+t/2,y+8,25);}
  else if(s.type==='chop'){
   rr(c,x+10,y-8,t-20,h-12,5,'#b5824c');rr(c,x+13,y-7,t-26,h-15,4,'#e5c693');line(c,x+17,y+5,x+t-16,y+5,'#bb965c50',1);
   rr(c,x+t-19,y-3,5,18,2,'#5f5b51');rr(c,x+t-20,y-14,8,17,2,'#e6eded');
  }else if(s.type==='pot'||s.type==='pan'){
   rr(c,x+9,y-10,t-18,h-9,5,'#5b6965');ellipse(c,x+t/2,y+11,23,15,s.cook>0?'#de8b43':'#34423f');
   if(s.type==='pot'){rr(c,x+16,y-2,t-32,22,7,'#586e73');ellipse(c,x+t/2,y-2,19,12,'#90a5a5');ellipse(c,x+t/2,y-3,15,9,s.item?'#e6d6aa':'#506b70');line(c,x+9,y+3,x+16,y+3,'#45626a',5);line(c,x+t-16,y+3,x+t-9,y+3,'#45626a',5);}
   else{line(c,x+t/2,y+5,x+t-8,y+22,'#263e3b',7);ellipse(c,x+t/2-2,y+1,21,14,'#334640');ellipse(c,x+t/2-2,y-1,18,11,'#4c5c50');}
  }else if(s.type==='oven'){
   rr(c,x+9,y-10,t-18,h-3,5,'#61706f');rr(c,x+13,y+2,t-26,h-19,3,'#293d3b');rr(c,x+17,y+6,t-34,h-27,2,s.cook>0?'#d59753':'#48625d');line(c,x+17,y,x+t-17,y,'#dfe5de',3);ellipse(c,x+20,y-6,2,2,'#e9c685');ellipse(c,x+t-20,y-6,2,2,'#e9c685');
  }else if(s.type==='plates'||s.type==='returns'){
   if(s.plates>0){for(let i=0;i<Math.min(4,s.plates);i++)drawFood(c,{parts:[],plate:true,dirty:s.type==='returns'&&k.spec.dirtyPlates},x+t/2,y+13-i*4,22);}else{ellipse(c,x+t/2,y+10,19,10,'#b9976a');}
  }else if(s.type==='sink'){
   rr(c,x+9,y-9,t-18,h-10,6,'#8aabae');rr(c,x+13,y-4,t-26,h-20,5,'#5d969f');c.strokeStyle='#e5edeb';c.lineWidth=4;c.beginPath();c.moveTo(x+t-15,y+2);c.lineTo(x+t-15,y-15);c.quadraticCurveTo(x+t-25,y-25,x+t-29,y-13);c.stroke();
  }else if(s.type==='serve'){
   rr(c,x+5,y-17,t-10,h+9,5,'#547d6c');rr(c,x+10,y-12,t-20,h-3,3,'#284a42');c.fillStyle='#f3e5b4';c.font='bold 13px system-ui';c.textAlign='center';c.fillText('SERVE',x+t/2,y+10);rr(c,x+5,y+25,t-10,6,2,'#dbb47f');
  }else if(s.type==='trash'){
   rr(c,x+19,y-1,t-38,h-12,5,'#667a70');ellipse(c,x+t/2,y-2,17,7,'#85988c');line(c,x+t/2-5,y-5,x+t/2+5,y-5,'#456557',4);
  }else{
   for(let i=0;i<3;i++)line(c,x+10,y-5+i*11,x+t-10,y-5+i*11,'#9e79441b',1);
   if(s.id==='assembly'){rr(c,x+8,y-9,t-16,h-12,4,'#e9daba');line(c,x+15,y-2,x+26,y-2,'#ab8b54',2);}
  }
  if(s.item)drawFood(c,s.item,x+t/2,y+7,s.type==='oven'?19:25);
  if(s.cook>0||s.over>0){const progress=s.cook>0?1-s.cook/s.total:1;rr(c,x+8,y+h-5,t-16,5,3,'#334f40');rr(c,x+8,y+h-5,(t-16)*progress,5,3,s.over>TIMING.burn*.65?'#ec7659':s.cook>0?'#efc967':'#8ac8a2');
   if(s.cook>0){for(let i=0;i<3;i++){const off=(time*13+i*11)%34;ellipse(c,x+t/2-9+i*9,y-10-off,3+off*.06,5,'#ffffff35');}}
  }
  if(s.progress>0){rr(c,x+8,y+h-5,t-16,5,3,'#5b685b');rr(c,x+8,y+h-5,(t-16)*s.progress/(s.type==='sink'?TIMING.wash:TIMING.chop),5,3,'#a8ceab');}
  if(s.burning){for(let i=0;i<3;i++){ellipse(c,x+22+i*12,y+3,6,10+Math.sin(time*5+i)*3,'#e8714b');ellipse(c,x+22+i*12,y+5,3,7,'#f5ce65');}}
  if(this.labels&&s.type!=='counter'&&s.type!=='wall'){
   c.textAlign='center';c.font='600 10px system-ui';c.fillStyle='#ffffffca';const label=isSupply?INGREDIENTS[s.ingredient].name:STATIONS[s.type];c.fillText(label,x+t/2,y+h+5);
  }
  this.hit.push({id:s.id,x,y:y-16,w:t,h:h+23});
 }
 chef(c,p,x,y,selected,time,working){
  const color=p.id?'#e99b63':'#58a99b',dark=p.id?'#ac6e48':'#327b72';
  ellipse(c,x,y+10,20,8,'#273f3835');if(selected){c.strokeStyle='#fff4bd';c.lineWidth=3;c.beginPath();c.ellipse(x,y+9,23,10,0,0,Math.PI*2);c.stroke();}
  const walk=Math.sin(time*10+p.id)*1.5;
  rr(c,x-13,y-5,10,17+walk,4,'#2d4846');rr(c,x+3,y-5,10,17-walk,4,'#2d4846');
  rr(c,x-19,y-31,38,35,13,color);rr(c,x-13,y-26,26,26,8,'#fff8e8');line(c,x-11,y-24,x+11,y-24,color,4);
  ellipse(c,x-22,y-16,6,8,'#e7b891');ellipse(c,x+22,y-16+(working?Math.sin(time*19)*5:0),6,8,'#e7b891');
  ellipse(c,x,y-36,17,16,'#f0caa7');ellipse(c,x-5,y-38,1.6,2,'#3e4c45');ellipse(c,x+6,y-38,1.6,2,'#3e4c45');
  c.beginPath();c.arc(x+1,y-32,4,0,Math.PI);c.strokeStyle='#b37f64';c.lineWidth=1.6;c.stroke();
  rr(c,x-18,y-52,36,14,5,'#fff8e9');ellipse(c,x-12,y-58,12,12,'#fffdf4');ellipse(c,x+2,y-62,14,13,'#fffdf4');ellipse(c,x+15,y-56,10,11,'#fffdf4');
  line(c,x-16,y-45,x+17,y-45,'#dfd9c5',2);
  if(p.held)drawFood(c,p.held,x+16,y-18,21);
  rr(c,x-12,y+19,24,18,7,dark);c.fillStyle='#fff8e9';c.font='bold 11px system-ui';c.textAlign='center';c.fillText('P'+(p.id+1),x,y+32);
 }
 plant(c,x,y,palette){ellipse(c,x,y+16,23,9,'#172d2d30');rr(c,x-16,y-2,32,26,6,'#ba8261');ellipse(c,x,y,17,7,'#d1a17b');for(let i=0;i<5;i++){c.save();c.translate(x,y-8);c.rotate((i-2)*.45);ellipse(c,0,-14,8,23,i%2?'#91ad7e':'#729a73');c.restore();}}
 lamp(c,x,y,time){const glow=c.createRadialGradient(x,y,1,x,y,49);glow.addColorStop(0,'#ffdf8e20');glow.addColorStop(1,'#ffdf8e00');c.fillStyle=glow;c.fillRect(x-50,y-50,100,100);line(c,x,y-33,x,y-13,'#b6b59b',2);rr(c,x-12,y-13,24,30,7,'#e4c587');line(c,x-12,y-5,x+12,y-5,'#b69a61',1);}
 stationFromPoint(clientX,clientY){const box=this.canvas.getBoundingClientRect(),x=(clientX-box.left)*this.canvas.width/box.width,y=(clientY-box.top)*this.canvas.height/box.height;return [...this.hit].reverse().find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h)?.id??null;}
}
