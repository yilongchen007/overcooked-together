// Hand-authored game data. Reference boundaries are documented in docs/fidelity.md.
export const INGREDIENTS = {
  fish: {name:'Fish', color:'#f18070', shape:'fish'}, rice:{name:'Rice',color:'#f4ebd5',shape:'rice'},
  nori:{name:'Nori',color:'#335848',shape:'sheet'}, beef:{name:'Beef',color:'#c65c59',shape:'meat'},
  bun:{name:'Bun',color:'#dca45f',shape:'bun'}, cheese:{name:'Cheese',color:'#efc64f',shape:'cheese'},
  dough:{name:'Dough',color:'#e9c99a',shape:'dough'}, tomato:{name:'Tomato',color:'#e8674c',shape:'tomato'},
};
export const RECIPES = {
  sushi:{id:'sushi',name:'Fish Sushi',family:'sushi',ingredients:['fish','rice','nori'],
    parts:[['fish','chopped'],['rice','cooked'],['nori','raw']], bake:false,
    steps:['Slice the fish','Boil the rice','Combine with nori on a plate','Serve'], value:60},
  burger:{id:'burger',name:'Burger',family:'burger',ingredients:['beef','bun'],
    parts:[['beef','cooked'],['bun','raw']], bake:false,
    steps:['Chop the beef','Fry in a pan','Combine with a bun on a plate','Serve'], value:60},
  cheeseburger:{id:'cheeseburger',name:'Cheeseburger',family:'burger',ingredients:['beef','bun','cheese'],
    parts:[['beef','cooked'],['bun','raw'],['cheese','chopped']], bake:false,
    steps:['Chop and fry the beef','Chop the cheese','Combine with a bun on a plate','Serve'], value:80},
  pizza:{id:'pizza',name:'Cheese Pizza',family:'pizza',ingredients:['dough','tomato','cheese'],
    parts:[['dough','chopped'],['tomato','chopped'],['cheese','chopped']], bake:true,
    steps:['Prepare the dough, tomato, and cheese','Assemble an unbaked pizza','Bake in the oven','Plate and serve'],value:80},
};
export const STATIONS = {
 counter:'Counter',chop:'Board',pot:'Pot',pan:'Pan',oven:'Oven',plates:'Plates',sink:'Sink',
 returns:'Returns',serve:'Serve',trash:'Bin',supply:'Supply',wall:'Wall',
};
export const TIMING = Object.freeze({dt:.2,chop:10,cook:28,bake:32,wash:10,burn:90,return:18});
const s=(id,type,x,y,extra={})=>({id,type,x,y,...extra});
const counter=(id,x,y)=>s(id,'counter',x,y);
function border(w,h){const a=[];for(let x=0;x<w;x++)a.push(counter(`edge-t${x}`,x,0),counter(`edge-b${x}`,x,h-1));for(let y=1;y<h-1;y++)a.push(counter(`edge-l${y}`,0,y),counter(`edge-r${y}`,w-1,y));return a;}
function room(stations,w=13,h=9){const fixed=border(w,h);for(const st of stations){const i=fixed.findIndex(v=>v.x===st.x&&v.y===st.y);if(i>=0)fixed.splice(i,1);fixed.push(st);}return {width:w,height:h,stations:fixed};}
export const SCENES = [
 {id:'sushi-city',name:'Sushi City',english:'Sushi City',reference:'Overcooked! 2 · 1–2',theme:'jade',
  roleMode:'flexible', description:'A shared kitchen. Both chefs can use every station and swap roles at any time.',
  provenance:'Adapted from the station arrangement in 1–2, with a simplified grid and no pedestrians.',
  menu:['sushi'],spawns:[[3,4],[9,4]],dirtyPlates:false,motion:null,
  ...room([s('chop1','chop',1,0),s('chop2','chop',2,0),s('chop3','chop',3,0),s('plates','plates',6,0),
   s('serve','serve',10,0),s('returns','returns',11,0),s('pot1','pot',10,8),s('pot2','pot',11,8),
   s('fish','supply',5,4,{ingredient:'fish'}),s('rice','supply',6,4,{ingredient:'rice'}),s('nori','supply',7,4,{ingredient:'nori'}),
   counter('assembly',9,3),s('trash','trash',6,8),s('sink','sink',1,8)])},
 {id:'burger-mine',name:'Moreish Mines',english:'Moreish Mines',reference:'Overcooked! 2 · 2–6',theme:'amber',
  roleMode:'fixed', description:'A divided kitchen. Prepare meat on the right, assemble and serve on the left. Pass food on the turntable.',
  provenance:'Retains the turntable, burgers, and dishwashing from 2–6. Counters rotate between discrete slots; original collision and falling mechanics are omitted.',
  menu:['burger','cheeseburger'],spawns:[[3,4],[9,4]],dirtyPlates:true,
  motion:{kind:'rotate',every:60,ids:['turn0','turn1','turn2','turn3','turn4','turn5','turn6','turn7'],
   slots:[[5,3],[6,3],[7,3],[7,4],[7,5],[6,5],[5,5],[5,4]]},
  ...room([s('bun','supply',0,2,{ingredient:'bun'}),s('cheese','supply',0,4,{ingredient:'cheese'}),s('beef','supply',12,2,{ingredient:'beef'}),
   s('chop1','chop',2,0),s('chop2','chop',10,0),s('pan1','pan',12,5),s('pan2','pan',12,6),s('plates','plates',1,8),
   s('sink','sink',2,8),s('returns','returns',3,8),s('serve','serve',0,6),counter('assembly',2,5),s('trash','trash',11,8),
   ...[1,2,6,7].map(y=>s('divider'+y,'wall',6,y,{divider:true})),
   ...[[5,3],[6,3],[7,3],[7,4],[7,5],[6,5],[5,5],[5,4]].map(([x,y],i)=>counter('turn'+i,x,y)),s('island','wall',6,4)])},
 {id:'pizza-castle',name:'Conjurer’s Kitchen',english:'Conjurer’s Kitchen',reference:'Overcooked! 2 · 3–1',theme:'violet',
  roleMode:'flexible', description:'A shared kitchen with moving boards. Swap preparation and baking duties as the routes change.',
  provenance:'Inspired by the moving boards in 3–1. Discrete shifts wait for clear destinations; room geometry and timing are simplified.',
  menu:['pizza'],spawns:[[3,4],[9,4]],dirtyPlates:true,
  motion:{kind:'slide',every:80,ids:['chop1','chop2','chop3'],a:[[4,2],[4,3],[4,4]],b:[[8,2],[8,3],[8,4]]},
  ...room([s('dough','supply',3,0,{ingredient:'dough'}),s('tomato','supply',5,0,{ingredient:'tomato'}),s('cheese','supply',7,0,{ingredient:'cheese'}),
   s('oven1','oven',12,3),s('oven2','oven',12,5),s('chop1','chop',4,2),s('chop2','chop',4,3),s('chop3','chop',4,4),
   s('plates','plates',5,8),s('sink','sink',7,8),s('returns','returns',8,8),s('serve','serve',0,5),counter('assembly',2,4),s('trash','trash',11,8)])}
];
export const splitExample = Object.freeze({
  description:'Interface example only, not a validated compositional benchmark. Pretrain every required ingredient-skill pair separately.',
  trainRecipes:['burger','sushi'],testRecipes:['cheeseburger','pizza'],
  skillCoverageRequired:['chop:fish','boil:rice','chop:beef','fry:beef','chop:cheese','chop:dough','chop:tomato','bake:pizza'],
});
