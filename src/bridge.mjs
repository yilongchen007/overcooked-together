// One long-lived simulator per Python environment; JSON lines over local stdio.
import readline from 'node:readline';
import {Kitchen,ACTIONS} from './engine.js';
import {FixedPartner} from './partner.js';
let env,bots;
for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
 try{const req=JSON.parse(line);let result;
  if(req.op==='reset'){env=new Kitchen(req.options);bots=[0,1].map(i=>new FixedPartner(i,{style:req.style||'balanced'}));result=env.result(0);}
  else{if(!env)throw Error('Call reset first');
   switch(req.op){
    case 'step':result=env.step(req.actions.map(a=>ACTIONS[a]));break;
    case 'observe':result=env.observe(req.id);break;
    case 'script_actions':result=bots.map((b,i)=>ACTIONS.indexOf(b.act(env.observe(i))));break;
    case 'export':result=env.exportEpisode();break;
    default:throw Error('Unknown operation');
   }
  }process.stdout.write(JSON.stringify({result})+'\n');
 }catch(e){process.stdout.write(JSON.stringify({error:e.message})+'\n');}
}
