const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir} from 'node:fs/promises';
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'overcooked-browser-'));
const replayPath=path.join(temp,'python-episode.json');
await mkdir(path.join(root,'artifacts'),{recursive:true});
execFileSync(process.env.PYTHON||path.join(root,'.venv/bin/python'),['-B','-c',`
import sys
from overcooked_together import parallel_env
with parallel_env(scene='burger-mine',horizon=500) as env:
    env.reset(seed=73)
    while env.agents: env.step(env.scripted_actions())
    env.export_episode(sys.argv[1])
`,replayPath],{cwd:root});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765');
await page.locator('#mode').selectOption('local');await page.locator('#start-btn').click();
const before=await page.evaluate(()=>window.kitchenApp.engine.players.map(p=>({x:p.x,y:p.y})));
await page.keyboard.down('s');await page.keyboard.down('ArrowDown');await page.waitForTimeout(460);await page.keyboard.up('s');await page.keyboard.up('ArrowDown');
const after=await page.evaluate(()=>window.kitchenApp.engine.players.map(p=>({x:p.x,y:p.y})));
assert.ok(after[0].y>before[0].y);assert.ok(after[1].y>before[1].y);
await page.keyboard.press('p');const paused=await page.evaluate(()=>window.kitchenApp.engine.tick);await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>window.kitchenApp.engine.tick),paused);
assert.equal(await page.evaluate(()=>Object.hasOwn(window.kitchenApp.engine.observe(0),'procedures')),false);
await page.locator('.switch').click();assert.equal(await page.evaluate(()=>Object.hasOwn(window.kitchenApp.engine.observe(0),'procedures')),true);await page.locator('.switch').click();
await page.locator('#help-btn').click();assert.equal(await page.locator('#help').evaluate(e=>e.open),true);await page.locator('#got-it').click();
// Navigate to a dispenser using only the click input's primitive path.
await page.locator('#reset-btn').click();await page.locator('#start-btn').click();
async function stationClick(id){const box=await page.locator('#kitchen').boundingBox();const point=await page.evaluate(id=>{const s=window.kitchenApp.engine.stations.find(s=>s.id===id);return{x:151.5+(s.x+.5)*69,y:135+s.y*53+8};},id);await page.mouse.click(box.x+point.x*box.width/1200,box.y+point.y*box.height/750);}
await stationClick('fish');await page.evaluate(()=>{for(let i=0;i<30;i++)window.kitchenApp.tick();});assert.equal(await page.evaluate(()=>window.kitchenApp.engine.players[0].held?.parts[0].type),'fish');
await stationClick('chop1');await page.evaluate(()=>{for(let i=0;i<30;i++)window.kitchenApp.tick();});assert.equal(await page.evaluate(()=>window.kitchenApp.engine.stations.find(s=>s.id==='chop1').item?.parts[0].stage),'raw');
await stationClick('chop1');await page.evaluate(()=>{for(let i=0;i<15;i++)window.kitchenApp.tick();});assert.equal(await page.evaluate(()=>window.kitchenApp.engine.stations.find(s=>s.id==='chop1').item?.parts[0].stage),'chopped');
// Replay an episode generated through the Python API.
await page.locator('details.research').evaluate(e=>e.open=true);
await page.locator('#replay-file').setInputFiles(replayPath);await page.waitForFunction(()=>document.getElementById('replay-status').textContent.startsWith('Replaying'));
await page.evaluate(()=>{for(let i=0;i<510;i++)window.kitchenApp.tick();});
const expected=JSON.parse(await readFile(replayPath,'utf8'));
assert.deepEqual(await page.evaluate(()=>window.kitchenApp.engine.exportEpisode().final),expected.final);
for(const width of [1440,1024,390]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await page.setViewportSize({width:1440,height:1050});await page.evaluate(()=>window.kitchenApp.selectScene('burger-mine'));await page.locator('#demo-btn').click();await page.evaluate(()=>{for(let i=0;i<400;i++)window.kitchenApp.tick();});await page.waitForTimeout(200);await page.screenshot({path:path.join(root,'artifacts/browser-preview.png'),fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS: keyboard both players, pause, oracle toggle, help, click-navigation + chopping, Python replay parity, 3 responsive widths; no page errors');
} finally {await browser.close();}
