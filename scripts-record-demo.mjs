// Record the real browser renderer with a deterministic clock; no trained policies.
// Requires playwright-core, Chrome, ffmpeg, and a running `npm start` server.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const root = fileURLToPath(new URL('.', import.meta.url));
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const fps = 12, secondsPerScene = 14, speed = 6;
await mkdir(new URL('docs/', import.meta.url), {recursive: true});
const encoder = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', '-',
  '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', `${root}docs/demo.mp4`], {stdio: ['pipe', 'inherit', 'inherit']});
const encoded = once(encoder, 'close');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const errors = [];
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1240}, deviceScaleFactor: 1});
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    let callbacks = [], time = 0;
    window.requestAnimationFrame = callback => (callbacks.push(callback), callbacks.length);
    window.advanceDemo = milliseconds => {
      const frames = Math.round(milliseconds / (1000 / 60));
      for (let i = 0; i < frames; i++) {
        time += 1000 / 60;
        const pending = callbacks; callbacks = [];
        pending.forEach(callback => callback(time));
      }
    };
  });
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8765');
  await page.waitForFunction(() => window.kitchenApp);
  for (const [scene, title, caption] of [
    ['sushi-city', 'Sushi City', 'Flexible roles · Prepare fish, cook rice, assemble and serve.'],
    ['burger-mine', 'Moreish Mines', 'Fixed roles · Cook on the right, pass food, assemble on the left.'],
    ['pizza-castle', 'Conjurer’s Kitchen', 'Flexible roles · Share moving boards, prepare toppings and bake.'],
  ]) {
    await page.evaluate(({scene, title, caption, speed}) => {
      window.kitchenApp.selectScene(scene);
      document.getElementById('demo-btn').click();
      document.querySelector('.intro h1').textContent = title;
      document.querySelector('.intro p').textContent = caption;
      document.querySelector('.header-note').textContent = `DEMO · Two scripted chefs · ${speed}× speed`;
      window.scrollTo(0, 0);
    }, {scene, title, caption, speed});
    for (let frame = 0; frame < fps * secondsPerScene; frame++) {
      await page.evaluate(ms => window.advanceDemo(ms), 1000 / fps * speed);
      const png = await page.screenshot();
      if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
    }
    const result = await page.evaluate(() => ({tick: window.kitchenApp.engine.tick,
      delivered: window.kitchenApp.engine.delivered, score: window.kitchenApp.engine.score}));
    if (!result.delivered) throw new Error(`No completed deliveries in ${scene}`);
    console.log(scene, result);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
  encoder.stdin.end();
}
if ((await encoded)[0] !== 0) throw new Error('Video encoding failed');
const preview = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', `${root}docs/demo.mp4`,
  '-filter_complex', 'fps=6,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
  '-loop', '0', `${root}docs/demo.gif`], {stdio: 'inherit'});
if ((await once(preview, 'close'))[0] !== 0) throw new Error('GIF encoding failed');
console.log('Saved docs/demo.mp4 and docs/demo.gif');
