import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
for (const [a, o] of [['jev', 'kimi'], ['manus', 'alexa'], ['devin', 'midjourney'], ['claude', 'jev']]) {
  await p.goto(`http://localhost:8777/index.html?fight=${a},${o}&arena=2`); await p.waitForFunction(() => window.TOKKEN && TOKKEN.match);
  const r = await p.evaluate(() => { TOKKEN.ctrls[0].cpu = TOKKEN.ctrls[1].cpu; for (let i = 0; i < 60 && !TOKKEN.match.over; i++) TOKKEN.tick(100); const m = TOKKEN.match; return { over: m.over, winner: m.winner && m.winner.id, round: m.round }; });
  console.log(a, o, JSON.stringify(r));
}
console.log('errors:', errs); await b.close();
