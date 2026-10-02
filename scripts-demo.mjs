import {Kitchen} from './src/engine.js';
import {FixedPartner} from './src/partner.js';
import {SCENES} from './src/content.js';
for(const scene of SCENES){const k=new Kitchen({scene:scene.id,horizon:1500});const bots=[new FixedPartner(0),new FixedPartner(1)];
 for(let t=0;t<1500;t++)k.step(bots.map((b,i)=>b.act(k.observe(i))));
 console.log(JSON.stringify({scene:scene.id,score:k.score,delivered:k.delivered,failed:k.failed,players:k.players,events:k.events.slice(-4)}));}
