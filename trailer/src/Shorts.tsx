import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, random, spring } from 'remotion';
import { F, Sfx, Sprite, bungee, press, dur } from './lib';
import BEATS from './beats.json';

// ================================================================ beat grid (music_battle.mp3, 143.5 BPM)
const B0 = BEATS.beats[0];                 // first detected beat (s)
export const LEAD = 0.5;                   // music starts this long before the first beat
export const MUSIC_FROM = Math.round((B0 - LEAD) * 30);
/** frame (relative to music start) of beat k */
export const beat = (k: number) => Math.round((BEATS.beats[k] - B0 + LEAD) * 30);
const BEAT_LEN = 60 / BEATS.tempo * 30;    // ~12.5 frames

// ================================================================ design primitives
const useScale = () => { const { width, height } = useVideoConfig(); return { v: height > width, s: Math.min(width, height) / 1080, width, height }; };
const GOLD = '#FFD23F', HOT = '#FF2D55';

/** full-bleed game footage: cropped in past the HUD, graded, with a zoom punch on each beat and optional slow-mo */
export const Clip: React.FC<{ shot: string; from: number; punches?: number[]; rate?: number; grade?: string; origin?: string }> = ({ shot, from, punches = [], rate = 1, grade, origin }) => {
  const f = useCurrentFrame(); const { v } = useScale();
  let punch = 0; for (const p of punches) { const t = f - p; if (t >= 0 && t < 8) punch = Math.max(punch, (1 - t / 8) * 0.07); }
  const base = v ? 1.28 : 1.32;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${base + punch + f * 0.0009})`, transformOrigin: origin ?? (v ? '50% 68%' : '50% 64%') }}>
        {/* vertical: footage fills the full 9:16 height (fighters sit at the centre of the game camera) */}
        <OffV shot={shot} from={from} rate={rate} v={v} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(0,0,0,0.55) 100%)' }} />
      {grade && <AbsoluteFill style={{ background: grade, mixBlendMode: 'color' }} />}
    </AbsoluteFill>
  );
};
const OffV: React.FC<{ shot: string; from: number; rate: number; v: boolean }> = ({ shot, from, rate, v }) => (
  <OffthreadVideo src={staticFile(`shots/${shot}.mp4`)} startFrom={from} playbackRate={rate} muted
    style={v ? { position: 'absolute', height: '100%', width: 'auto', left: '50%', transform: 'translateX(-50%)', maxWidth: 'none', filter: 'contrast(1.08) saturate(1.2)' }
             : { width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.08) saturate(1.2)' }} />
);

/** big kinetic caption: each word slams in on its own frame; `hi` words get a gold highlight box */
export const Slam: React.FC<{ words: string[]; at?: number[]; hi?: number[]; size?: number; y?: string; color?: string; hiColor?: string }> = ({ words, at, hi = [], size = 118, y, color = '#fff', hiColor = GOLD }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { v, s, width } = useScale(); const longest = Math.max(...words.map(w => w.length)); const px = Math.min(size * s * (v ? 1.05 : 0.95), width * 0.84 / (longest * 0.86 + 0.4));
  return (<>
    <div style={{ position: 'absolute', left: 0, right: 0, top: `calc(${y ?? (v ? '12%' : '8%')} - ${px * 0.6}px)`, height: px * 3.2, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.55) 70%, transparent)', opacity: f >= (at ? at[0] : 0) ? 1 : 0 }} />
    <div style={{ position: 'absolute', left: '6%', right: '6%', top: y ?? (v ? '12%' : '8%'), display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${px * 0.12}px ${px * 0.28}px`, textAlign: 'center' }}>
      {words.map((w, i) => { const t0 = at ? at[i] : i * 4; if (f < t0) return null; const k = spring({ frame: f - t0, fps, config: { damping: 12, stiffness: 260, mass: 0.6 } });
        const isHi = hi.includes(i);
        return <span key={i} style={{ display: 'inline-block', fontFamily: bungee, fontSize: px, lineHeight: 1, fontStyle: 'italic', color: isHi ? '#000' : color, background: isHi ? hiColor : 'transparent', padding: isHi ? `0 ${px * 0.12}px` : 0,
          WebkitTextStroke: isHi ? '0' : `${px / 14}px #000`, paintOrder: 'stroke fill', textShadow: isHi ? 'none' : `0 ${px / 12}px 0 #000`, boxShadow: isHi ? `0 ${px / 12}px 0 #000` : 'none',
          transform: `scale(${interpolate(k, [0, 1], [1.9, 1])}) rotate(${interpolate(k, [0, 1], [i % 2 ? 7 : -7, isHi ? -2 : 0])}deg)`, opacity: Math.min(1, k * 3) }}>{w}</span>; })}
    </div>
  </>);
};

/** small label strip ("ULTIMATE", fighter name) */
export const Tag: React.FC<{ text: string; color?: string; y?: string }> = ({ text, color = HOT, y }) => {
  const f = useCurrentFrame(); const { v, s } = useScale();
  return <div style={{ position: 'absolute', left: v ? '50%' : 70 * s, top: y ?? (v ? '78%' : '80%'), transform: `translateX(${v ? '-50%' : '0'}) translateX(${interpolate(f, [0, 6], [-80, 0], { extrapolateRight: 'clamp' })}px) skewX(-10deg)`, background: color, color: '#fff', fontFamily: press, fontSize: 30 * s * (v ? 1.2 : 1), padding: `${14 * s}px ${24 * s}px`, border: `${4 * s}px solid #000`, boxShadow: `${8 * s}px ${8 * s}px 0 #000`, whiteSpace: 'nowrap', opacity: interpolate(f, [0, 4], [0, 1], { extrapolateRight: 'clamp' }) }}>{text}</div>;
};

/** hard-cut glitch: RGB split + white flash for a couple of frames */
export const Hit: React.FC<{ len?: number; color?: string }> = ({ len = 5, color = '#fff' }) => {
  const f = useCurrentFrame(); if (f >= len) return null;
  return <AbsoluteFill style={{ background: color, opacity: interpolate(f, [0, len], [0.75, 0]), mixBlendMode: 'screen' }} />;
};

/** end card: logo + url, tight */
export const EndCard: React.FC<{ line?: string }> = ({ line = 'FREE • IN YOUR BROWSER • ONLINE PVP' }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { v, s } = useScale(); const k = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #3a0a12 0%, #07070d 70%)', alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 24 }).map((_, i) => <div key={i} style={{ position: 'absolute', left: `${random(`e${i}`) * 100}%`, top: `${((random(`t${i}`) * 100) - f * (0.3 + random(`v${i}`))) % 100 + 100}%`, width: 6 * s, height: 6 * s, background: GOLD, opacity: 0.35, transform: 'rotate(45deg)' }} />)}
      <Img src={staticFile('logo.png')} style={{ width: (v ? 960 : 1180) * s * (v ? 1 : 1.1), transform: `scale(${interpolate(k, [0, 1], [1.6, 1])}) rotate(-3deg)` }} />
      <div style={{ marginTop: 50 * s, fontFamily: press, fontSize: (v ? 86 : 64) * s, color: GOLD, textShadow: `0 ${7 * s}px 0 #000`, opacity: interpolate(f, [6, 12], [0, 1], { extrapolateRight: 'clamp' }), transform: `translateY(${interpolate(f, [6, 14], [30, 0], { extrapolateRight: 'clamp' })}px)` }}>tokken.win</div>
      <div style={{ marginTop: 30 * s, fontFamily: press, fontSize: (v ? 30 : 24) * s, color: '#fff', opacity: interpolate(f, [12, 18], [0, 0.9], { extrapolateRight: 'clamp' }), textAlign: 'center', padding: '0 6%', lineHeight: 1.6 }}>{line}</div>
    </AbsoluteFill>
  );
};

const Music: React.FC<{ total: number; delay?: number; vol?: number }> = ({ total, delay = 0, vol = 0.62 }) => (
  <Sequence from={delay}><Audio src={staticFile('audio/music_battle.mp3')} startFrom={MUSIC_FROM} volume={x => interpolate(x, [0, total - delay - 18, total - delay], [vol, vol, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} /></Sequence>
);
const Whoosh: React.FC<{ vol?: number }> = ({ vol = 0.35 }) => <Sfx src="audio/sfx_whoosh.mp3" volume={vol} />;

// ================================================================ A · "HP IS TOKENS"
const A_CUTS: { shot: string; from: number; top: string[]; hi: number[]; tag: string }[] = [
  { shot: 'ult_jev', from: 70, top: ['JEV', 'ONLY', 'SPEAKS', 'JSON'], hi: [3], tag: '{"you": "lose"}' },
  { shot: 'ult_deepseek', from: 58, top: ['DEEPSEEK', 'STEALS', 'YOUR', 'ULT'], hi: [1], tag: 'FOR 1% OF THE PRICE' },
  { shot: 'ult_codex', from: 64, top: ['CODEX', 'SHIPS', 'ON', 'FRIDAY'], hi: [3], tag: 'NO TESTS. OBVIOUSLY.' },
  { shot: 'ult_kimi', from: 34, top: ['KIMI', 'DROPS', 'THE', 'MOON'], hi: [3], tag: 'THE WHOLE MOON' },
  { shot: 'ult_openclaw', from: 62, top: ['OPENCLAW', 'SUMMONS', 'LOBSTERS'], hi: [2], tag: 'EXFOLIATE!' },
  { shot: 'ult_mistral', from: 60, top: ['MISTRAL', 'GOES', 'ON', 'STRIKE'], hi: [3], tag: 'MID-FIGHT' },
];
export const HP: React.FC = () => {
  const L: React.ReactNode[] = []; let at = 0;
  const push = (len: number, el: React.ReactNode) => { L.push(<Sequence key={at} from={at} durationInFrames={len}>{el}</Sequence>); at += len; };
  // hook on beats 0-5: three word-pairs over the lobster swarm
  const h = beat(6);
  push(h, <AbsoluteFill><Clip shot="ult_openclaw" from={48} punches={[beat(0), beat(2), beat(4)]} /><Slam words={['AI', 'MODELS,', 'BUT', 'THEY', 'FIGHT.']} at={[0, beat(0), beat(2), beat(3), beat(4)]} hi={[4]} size={150} y="30%" /><Sfx src="audio/sfx_huge.mp3" volume={0.55} /></AbsoluteFill>);
  A_CUTS.forEach((c, i) => { const len = beat(8 + i * 2) - beat(6 + i * 2);
    push(len, <AbsoluteFill><Clip shot={c.shot} from={c.from} punches={[0, Math.round(BEAT_LEN)]} /><Slam words={c.top} at={c.top.map((_, k) => k * 2)} hi={c.hi} size={104} /><Sequence from={6}><Tag text={c.tag} /></Sequence><Hit /><Whoosh /></AbsoluteFill>); });
  // HP = TOKENS: counter drains
  push(beat(22) - beat(18), <AbsoluteFill><Clip shot="ko" from={96} rate={0.6} grade="rgba(120,0,20,0.35)" /><TokenDrain /><Hit color={HOT} /><Sfx src="audio/sfx_ko.mp3" volume={0.9} /></AbsoluteFill>);
  push(66, <AbsoluteFill><EndCard /><Hit /><Sfx src="audio/title.mp3" volume={1.1} /></AbsoluteFill>);
  return <AbsoluteFill style={{ background: '#000' }}>{L}<Music total={at} /></AbsoluteFill>;
};
const TokenDrain: React.FC = () => {
  const f = useCurrentFrame(); const { v, s } = useScale(); const n = Math.max(0, Math.round(65536 * (1 - f / 34) ** 2));
  return (<>
    <Slam words={['HP', '=', 'TOKENS']} at={[0, 3, 6]} hi={[2]} size={150} y={v ? '22%' : '14%'} hiColor={HOT} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: v ? '60%' : '66%', textAlign: 'center', fontFamily: press, fontSize: 84 * s, color: n < 8000 ? HOT : GOLD, textShadow: `0 ${8 * s}px 0 #000` }}>{n.toLocaleString('en-US')}</div>
    <div style={{ position: 'absolute', left: '15%', right: '15%', top: v ? '67%' : '78%', height: 30 * s, background: '#10121e', border: `${4 * s}px solid #000` }}><div style={{ width: `${n / 655.36}%`, height: '100%', background: `linear-gradient(180deg,#fff1a8,${GOLD},#c98a00)` }} /></div>
  </>);
};

// ================================================================ B · "ABSOLUTELY"
const AB = [beat(4) - beat(0), beat(7) - beat(4), beat(9) - beat(7), beat(11) - beat(9)];
export const Absolutely: React.FC = () => {
  const L: React.ReactNode[] = []; let at = 0;
  const push = (len: number, el: React.ReactNode) => { L.push(<Sequence key={at} from={at} durationInFrames={len}>{el}</Sequence>); at += len; };
  push(84, <Chat />);
  const drop = at;
  push(AB[0], <AbsoluteFill><Clip shot="ult_cursor" from={62} punches={[0, beat(1) - beat(0), beat(2) - beat(0), beat(3) - beat(0)]} /><Slam words={['IT', 'WAS', 'NOT', 'ABSOLUTELY.']} at={[4, 10, 16, 24]} hi={[2]} hiColor={HOT} size={116} /><Hit /><Sfx src="audio/f_cursor_ult.mp3" volume={0.9} fadeOutAt={AB[0]} /></AbsoluteFill>);
  push(AB[1], <AbsoluteFill><Clip shot="ko" from={104} rate={0.5} grade="rgba(20,20,60,0.35)" /><Slam words={["YOU'RE", 'ABSOLUTELY', 'RIGHT,', 'MY', 'MISTAKE.']} at={[0, 4, 8, 12, 14]} hi={[1]} size={88} y="58%" /><Sfx src="audio/v_codex_hurt1.mp3" volume={1.2} /></AbsoluteFill>);
  push(AB[2], <AbsoluteFill><Clip shot="ult_openclaw" from={70} punches={[0]} /><Slam words={['22', 'AI', 'MODELS.']} hi={[0]} size={130} y="40%" /><Hit /><Whoosh /></AbsoluteFill>);
  push(AB[3], <AbsoluteFill><Clip shot="ult_kimi" from={40} punches={[0]} /><Slam words={['ONE', 'TOKEN', 'BUDGET.']} hi={[1]} size={130} y="40%" /><Hit /><Whoosh /></AbsoluteFill>);
  push(66, <AbsoluteFill><EndCard /><Hit /><Sfx src="audio/title.mp3" volume={1.1} /></AbsoluteFill>);
  return <AbsoluteFill style={{ background: '#000' }}>{L}<Music total={at} delay={drop - Math.round(LEAD * 30)} vol={0.7} /></AbsoluteFill>;
};
const Chat: React.FC = () => {
  const f = useCurrentFrame(); const { v, s } = useScale(); const k = (t: number) => interpolate(f, [t, t + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const q = 'can you beat Cursor in a fight?'; const typed = q.slice(0, Math.max(0, Math.floor((f - 4) * 1.6)));
  const bubble = (mine: boolean): React.CSSProperties => ({ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%', padding: `${26 * s}px ${34 * s}px`, borderRadius: 36 * s, fontFamily: 'Inter, -apple-system, Helvetica, Arial, sans-serif', fontSize: (v ? 66 : 46) * s, lineHeight: 1.3, background: mine ? '#303030' : 'transparent', color: '#ececec' });
  return (
    <AbsoluteFill style={{ background: '#212121', padding: v ? `${260 * s}px ${60 * s}px` : `${120 * s}px ${360 * s}px`, display: 'flex', flexDirection: 'column', gap: 40 * s, justifyContent: 'center' }}>
      <div style={{ ...bubble(true), opacity: k(0) }}>{typed}<span style={{ opacity: f % 16 < 8 ? 1 : 0 }}>|</span></div>
      {f > 34 && <div style={{ ...bubble(false), opacity: k(34), display: 'flex', gap: 20 * s, alignItems: 'flex-start' }}>
        <Sprite id="codex" pose="idle" style={{ height: 120 * s, borderRadius: 45 * s, background: '#fff' }} />
        <div><b>Absolutely!</b> Great question! 🙌{f > 52 && <><br />Let me inspect the repository<span style={{ opacity: f % 12 < 6 ? 1 : 0.2 }}>…</span></>}</div>
      </div>}
      <Sequence from={36}><Sfx src="audio/v_codex_line.mp3" volume={1.25} /></Sequence>
      <Sequence from={2}><Sfx src="audio/sfx_notif.mp3" volume={0.4} /></Sequence>
    </AbsoluteFill>
  );
};

// ================================================================ C · "PICK YOUR MAIN"
const ROAST: Record<string, string> = { claude: 'SORRY.', codex: 'ABSOLUTELY.', gemini: 'RENAMED.', grok: 'RATIO.', llama: 'FORK ME.', dolphin: 'EEEEEE.', deepseek: '$5.6M.', mistral: 'EN GRÈVE.', perplexity: '[CITATION]', muse: 'DATA PLS.', qwen: 'V4 TUESDAY.', siri: '2027.', cursor: '$4,812.', jev: 'true', alexa: 'DESPACITO.', manus: 'WAITLISTED.', midjourney: '6 FINGERS.', devin: '45 MIN.', kimi: 'THE MOON.', openclaw: 'EXFOLIATE.', hermes: '+1 SKILL.' };
export const PickMain: React.FC = () => {
  const ids = F.roster.filter(id => !F.f[id].secret); const L: React.ReactNode[] = []; let at = 0;
  const push = (len: number, el: React.ReactNode) => { L.push(<Sequence key={at} from={at} durationInFrames={len}>{el}</Sequence>); at += len; };
  push(beat(2), <AbsoluteFill><Clip shot="select" from={10} punches={[beat(0)]} /><Slam words={['PICK', 'YOUR', 'MAIN']} at={[0, 6, beat(0)]} hi={[2]} size={170} y="36%" /></AbsoluteFill>);
  ids.forEach((id, i) => push(beat(3 + i) - beat(2 + i), <RoastCard id={id} i={i} />));
  push(beat(3 + ids.length + 3) - beat(2 + ids.length), <SecretBoss />);
  push(66, <AbsoluteFill><EndCard line="22 AGENTS • FREE • ONLINE PVP" /><Hit /><Sfx src="audio/title.mp3" volume={1.1} /></AbsoluteFill>);
  return <AbsoluteFill style={{ background: '#000' }}>{L}<Music total={at} /></AbsoluteFill>;
};
const RoastCard: React.FC<{ id: string; i: number }> = ({ id, i }) => {
  const f = useCurrentFrame(); const { v, s } = useScale(); const c = F.f[id]; const side = i % 2 ? -1 : 1; const k = interpolate(f, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: c.color, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `repeating-linear-gradient(${side * 55}deg, rgba(0,0,0,0.13) 0 ${40 * s}px, transparent ${40 * s}px ${80 * s}px)`, transform: `translateX(${f * 6 * side}px)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(0,0,0,0.55) 100%)' }} />
      <Sprite id={id} pose={i % 3 === 2 ? 'special' : 'win'} style={{ position: 'absolute', height: (v ? 1120 : 820) * s, bottom: v ? '8%' : '-4%', left: '50%', transform: `translateX(${-50 + side * (v ? 0 : 18)}%) scale(${interpolate(k, [0, 1], [1.25, 1])}) scaleX(${side})`, filter: 'drop-shadow(0 0 0 #000) drop-shadow(12px 12px 0 rgba(0,0,0,0.5))' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: v ? '9%' : '10%', textAlign: 'center', transform: `translateY(${interpolate(k, [0, 1], [-40, 0])}px)` }}>
        <div style={{ fontFamily: bungee, fontStyle: 'italic', fontSize: (v ? 150 : 130) * s, color: '#fff', WebkitTextStroke: `${10 * s}px #000`, paintOrder: 'stroke fill', textShadow: `0 ${10 * s}px 0 #000`, lineHeight: 1 }}>{c.name}</div>
        <div style={{ display: 'inline-block', marginTop: 26 * s, background: '#000', color: GOLD, fontFamily: id === 'jev' ? 'ui-monospace, Menlo, monospace' : bungee, fontSize: (v ? 90 : 76) * s, padding: `${8 * s}px ${30 * s}px`, transform: 'rotate(-3deg)' }}>{ROAST[id]}</div>
      </div>
      <Sfx src="audio/sfx_light.mp3" volume={0.35} />
    </AbsoluteFill>
  );
};
const SecretBoss: React.FC = () => {
  const f = useCurrentFrame(); const { v, s } = useScale();
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Sprite id="clippy" pose="idle" style={{ height: (v ? 900 : 640) * s, filter: f < 18 ? 'brightness(0)' : 'none', transform: `scale(${1 + f * 0.004})` }} />
      <Slam words={f < 18 ? ['…AND', 'ONE', 'SECRET', 'BOSS'] : ['HE', 'CAME', 'BACK.']} at={f < 18 ? [0, 3, 6, 9] : [0, 2, 4]} hi={f < 18 ? [2] : [2]} hiColor={HOT} size={110} y={v ? '10%' : '6%'} />
      {f === 18 && <Hit />}
      <Sequence from={18}><Sfx src="audio/sfx_error.mp3" volume={0.7} /></Sequence>
    </AbsoluteFill>
  );
};

// ================================================================ D · "IN A WORLD"
export const InAWorld: React.FC = () => {
  const L: React.ReactNode[] = []; let at = 0;
  const push = (len: number, el: React.ReactNode) => { L.push(<Sequence key={at} from={at} durationInFrames={len}>{el}</Sequence>); at += len; };
  const n1 = dur('vo/n01.mp3') + 4;
  push(n1, <AbsoluteFill><Clip shot="brawl" from={30} rate={0.35} grade="rgba(40,40,60,0.9)" /><AbsoluteFill style={{ background: 'rgba(0,0,0,0.35)' }} /><Serif text="IN A WORLD WHERE EVERY AI CLAIMS TO BE #1…" /><Sfx src="vo/n01.mp3" volume={1.15} /></AbsoluteFill>);
  const n4 = dur('vo/n04.mp3') + 2;
  push(n4, <AbsoluteFill><Clip shot="ult_kimi" from={28} rate={0.3} grade="rgba(40,40,60,0.9)" /><AbsoluteFill style={{ background: 'rgba(0,0,0,0.45)' }} /><Serif text="WHO RUNS OUT OF TOKENS FIRST." /><Sfx src="vo/n04.mp3" volume={1.2} /></AbsoluteFill>);
  const drop = at;
  const cuts: [string, number, string][] = [['ult_openclaw', 64, 'EXFOLIATE'], ['ult_deepseek', 58, 'DISTILLED'], ['ult_qwen', 62, 'TSUNAMI'], ['ult_jev', 72, '{"ko": true}'], ['ult_codex', 64, 'SHIPPED'], ['ult_hermes', 64, '+1 SKILL'], ['ult_mistral', 62, 'EN GRÈVE'], ['ult_kimi', 36, 'ECLIPSE']];
  cuts.forEach(([shot, from, word], i) => push(beat(i + 1) - beat(i), <AbsoluteFill><Clip shot={shot} from={from} punches={[0]} /><Slam words={[word]} hi={[0]} hiColor={i % 2 ? HOT : GOLD} size={140} y="42%" /><Hit /></AbsoluteFill>));
  push(beat(12) - beat(8), <AbsoluteFill><Clip shot="ko" from={104} rate={0.5} /><Slam words={['SAME', 'TOKENS.', 'DIFFERENT', 'PROBLEMS.']} at={[0, 5, 12, 17]} hi={[3]} size={104} y="34%" /><Sfx src="audio/ko.mp3" volume={1} /></AbsoluteFill>);
  push(66, <AbsoluteFill><EndCard /><Hit /><Sfx src="audio/title.mp3" volume={1.1} /></AbsoluteFill>);
  return <AbsoluteFill style={{ background: '#000' }}>{L}<Sequence from={drop - Math.round(LEAD * 30)}><Sfx src="audio/sfx_huge.mp3" volume={0.9} /></Sequence><Music total={at} delay={drop - Math.round(LEAD * 30)} vol={0.72} /></AbsoluteFill>;
};
const Serif: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame(); const { v, s } = useScale();
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 9%' }}><div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: (v ? 76 : 64) * s, letterSpacing: 6 * s, lineHeight: 1.35, color: '#f4efe2', textAlign: 'center', opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' }), transform: `scale(${1 + f * 0.0012})`, textShadow: '0 0 40px rgba(0,0,0,0.9)' }}>{text}</div></AbsoluteFill>;
};

// ================================================================ durations (frames)
export const LEN = {
  HP: beat(22) + 66,
  Absolutely: 84 + beat(11) - beat(0) + 66,
  PickMain: beat(2 + 21 + 3 + 1) - 0 + 66,
  InAWorld: dur('vo/n01.mp3') + 4 + dur('vo/n04.mp3') + 2 + beat(12) - beat(0) + 66,
};
