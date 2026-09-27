import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, random } from 'remotion';
import { CRT, Caption, Chrome, F, Flash, Letterbox, Sfx, Shot, Sprite, bungee, cinzel, dur, line, pop, press, useShake, useVideoConfig } from './lib';

// ---------------------------------------------------------------- scene 1: deadpan movie-trailer cold open
const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const LINES: [number, string][] = [[8, 'IN A WORLD…'], [60, 'WHERE EVERY AI CLAIMS TO BE #1…'], [140, 'WHERE BENCHMARKS ARE OPTIONAL…'], [215, 'AND NOBODY… RUNS THE TESTS…'], [305, 'THERE CAN BE ONLY ONE QUESTION.']];
  const cur = [...LINES].reverse().find(([at]) => f >= at);
  const flicker = [380, 386, 393, 398, 404, 409].includes(f) || [381, 394, 405].includes(f);   // subliminal gameplay flashes under the whisper
  const flickShot = ['ult_openclaw', 'ult_kimi', 'ult_jev', 'ult_codex', 'ult_qwen', 'ult_deepseek'][Math.floor(f / 6) % 6];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {Array.from({ length: 60 }).map((_, i) => { const x = random(`px${i}`) * 1920, y = (random(`py${i}`) * 1080 - f * (0.2 + random(`pv${i}`) * 0.6)) % 1080; return <div key={i} style={{ position: 'absolute', left: x, top: (y + 1080) % 1080, width: 3, height: 3, borderRadius: 2, background: '#ffd23f', opacity: 0.15 + random(`po${i}`) * 0.25 }} />; })}
      {cur && f < 372 && <div key={cur[0]} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontWeight: 700, fontSize: 64, letterSpacing: 10, color: '#f4efe2', opacity: interpolate(f - cur[0], [0, 14, 60, 74], [0, 1, 1, 0.25], { extrapolateRight: 'clamp' }), transform: `scale(${1 + (f - cur[0]) * 0.0009})`, textShadow: '0 0 30px rgba(255,210,63,0.25)' }}>{cur[1]}</div>}
      {f >= 380 && !flicker && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontWeight: 700, fontSize: 84, letterSpacing: 12, color: '#fff' }}>WHO RUNS OUT OF TOKENS FIRST.</div>}
      {flicker && <AbsoluteFill><Shot name={flickShot} from={40} /></AbsoluteFill>}
      <Sequence from={8}><Sfx src="vo/n01.mp3" /></Sequence>
      <Sequence from={138}><Sfx src="vo/n02.mp3" /></Sequence>
      <Sequence from={303}><Sfx src="vo/n03.mp3" /></Sequence>
      <Sequence from={378}><Sfx src="vo/n04.mp3" /></Sequence>
      <Audio src={staticFile('audio/music_title.mp3')} volume={v => interpolate(v, [0, 60, 420, 450], [0, 0.18, 0.18, 0], { extrapolateRight: 'clamp' })} />
      <Letterbox h={110} />
      <CRT strength={0.5} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 2: title slam
const Title: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 0, 9);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center,#3a0808 0%,#07070d 70%)', transform: useShake([0, 3], 30, 14) }}>
      <AbsoluteFill style={{ opacity: 0.35 }}><Shot name="brawl" from={20} /></AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Img src={staticFile('logo.png')} style={{ width: 1500, transform: `scale(${interpolate(s, [0, 1], [3.2, 1])}) rotate(${interpolate(s, [0, 1], [-8, -2])}deg)` }} />
        <div style={{ marginTop: 40, fontFamily: press, fontSize: 36, color: '#fff', letterSpacing: 4, opacity: interpolate(f, [18, 26], [0, 1], { extrapolateRight: 'clamp' }), textShadow: '0 4px 0 #000' }}>AI MODELS FIGHT. HP IS TOKENS.</div>
      </AbsoluteFill>
      <Flash len={10} />
      <Sfx src="audio/sfx_huge.mp3" /><Sequence from={2}><Sfx src="audio/title.mp3" volume={1.2} /></Sequence>
      <CRT />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 3: Tekken-style character cards
const CARDS: [string, string, string][] = [
  ['claude', 'colosseum', 'WILL APOLOGIZE. THEN HIT YOU.'], ['codex', 'basement', 'HAS NEVER RUN THE TESTS.'], ['deepseek', 'distillation', 'TRAINED FOR LESS THAN YOUR LUNCH.'],
  ['grok', 'feed', 'COMMUNITY NOTED.'], ['gemini', 'demoday', 'FORMERLY BARD. FORMERLY… NEVER MIND.'], ['jev', 'leaderboard', '{"speaks_only": "json"}'],
  ['openclaw', 'hackerhouse', 'HAS SHELL ACCESS. TO YOUR LIFE.'], ['hermes', 'singularity', 'REMEMBERS EVERYTHING. GROWS LIKE A DIVINE FUNGUS.'], ['mistral', 'boardroom', 'ON STRIKE. BACK AFTER LUNCH.'],
  ['siri', 'tesla', 'DELAYED TO 2027.'], ['kimi', 'graveyard', 'ONE TRILLION PARAMETERS. 32B AWAKE.'],
];
export const CARD_LEN = 46;
const Card: React.FC<{ id: string; arena: string; joke: string; i: number }> = ({ id, arena, joke, i }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const c = F.f[id]; const side = i % 2 ? -1 : 1;
  const inS = pop(f, fps, 0, 12), txt = pop(f, fps, 5, 13);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <Img src={staticFile(`arenas/${arena}.webp`)} style={{ position: 'absolute', width: '115%', left: `${-5 - f * 0.25}%`, top: -60, filter: 'blur(3px) brightness(0.45) saturate(1.3)' }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${side > 0 ? 100 : 260}deg, ${c.color}cc 0%, ${c.color}44 38%, transparent 62%)`, mixBlendMode: 'screen' }} />
      {Array.from({ length: 14 }).map((_, k) => <div key={k} style={{ position: 'absolute', top: 120 + k * 60, left: side > 0 ? -200 + ((f * 60 + k * 170) % 2400) - 200 : 2100 - ((f * 60 + k * 170) % 2400), width: 380, height: 4, background: '#fff', opacity: 0.25 }} />)}
      <Sprite id={id} pose={f > 24 ? 'special' : 'win'} style={{ position: 'absolute', height: 760, bottom: 60, [side > 0 ? 'left' : 'right']: interpolate(inS, [0, 1], [-700, 150]), transform: `scaleX(${side > 0 ? 1 : -1})`, filter: `drop-shadow(0 0 40px ${c.color})` }} />
      <div style={{ position: 'absolute', top: 250, [side > 0 ? 'right' : 'left']: 120, textAlign: side > 0 ? 'right' : 'left', transform: `translateX(${interpolate(txt, [0, 1], [side * 600, 0])}px)` } as React.CSSProperties}>
        <div style={{ fontFamily: press, fontSize: 30, color: c.color, letterSpacing: 3, textShadow: '0 3px 0 #000' }}>{c.title}</div>
        <Chrome size={170} tone="silver" style={{ marginTop: 16 }}>{c.name}</Chrome>
        <div style={{ marginTop: 34, display: 'inline-block', background: '#000', color: '#fff', fontFamily: press, fontSize: 30, padding: '16px 22px', border: `4px solid ${c.color}`, maxWidth: 900, whiteSpace: 'normal', lineHeight: 1.4 }}>{joke}</div>
        {c.isNew && <div style={{ marginTop: 20, display: 'inline-block', marginLeft: 16, background: '#ff2d6f', color: '#fff', fontFamily: press, fontSize: 28, padding: '10px 16px', transform: 'rotate(-6deg)' }}>NEW!</div>}
      </div>
      <Flash len={5} strength={0.6} />
      <Sfx src="audio/sfx_whoosh.mp3" volume={0.9} />
      <CRT strength={0.7} />
    </AbsoluteFill>
  );
};
const Grid: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const ids = F.roster.filter(id => !F.f[id].secret);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center,#1a1030 0%,#050509 75%)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 200px)', gap: 18, marginTop: -60 }}>
        {ids.map((id, i) => { const s = pop(f, fps, i * 1.2, 12); return <div key={id} style={{ width: 200, height: 200, background: '#10121e', border: `4px solid ${F.f[id].color}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', transform: `scale(${s})`, overflow: 'hidden' }}><Sprite id={id} pose="idle" style={{ height: 180 }} /></div>; })}
      </div>
      <div style={{ position: 'absolute', bottom: 120 }}><Chrome size={78} tone="gold">22 AGENTS. ZERO ALIGNMENT.</Chrome></div>
      <Sfx src="vo/n05.mp3" /><Sfx src="audio/sfx_select.mp3" volume={0.6} />
      <CRT />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 4: ult montage with the booth
export const MONTAGE: { shot: string; len: number; from: number; label: string; sub: string; audio: string; vol?: number }[] = [
  { shot: 'ult_jev', len: 96, from: 62, label: 'JEV — 50MS FORWARD PASS', sub: 'IT DOES NOT THINK. IT DECIDES. IN JSON.', audio: 'audio/v_jev_ult.mp3' },
  { shot: 'ult_openclaw', len: 110, from: 60, label: 'OPENCLAW — EXFOLIATE!', sub: line('f_openclaw_ult'), audio: 'audio/f_openclaw_ult.mp3' },
  { shot: 'ult_deepseek', len: 110, from: 55, label: 'DEEPSEEK — DISTILLATION', sub: line('f_deepseek_ult'), audio: 'audio/f_deepseek_ult.mp3' },
  { shot: 'ult_codex', len: 100, from: 58, label: 'CODEX — SHIP TO PROD', sub: line('f_codex_ult'), audio: 'audio/f_codex_ult.mp3' },
  { shot: 'ult_kimi', len: 96, from: 34, label: 'KIMI — ECLIPSE', sub: line('f_kimi_ult'), audio: 'audio/f_kimi_ult.mp3' },
  { shot: 'ult_mistral', len: 84, from: 58, label: 'MISTRAL — GRÈVE GÉNÉRALE', sub: line('f_mistral_ult'), audio: 'audio/f_mistral_ult.mp3' },
  { shot: 'ult_qwen', len: 78, from: 60, label: 'QWEN — OPEN-WEIGHT TSUNAMI', sub: 'NEW MODEL EVERY WEEK. THIS ONE IS A WAVE.', audio: 'audio/sfx_ult.mp3', vol: 0.7 },
  { shot: 'ult_hermes', len: 54, from: 62, label: 'HERMES — MESSENGER OF THE GODS', sub: '', audio: 'audio/sfx_huge.mp3', vol: 0.5 },
  { shot: 'ult_alexa', len: 54, from: 66, label: 'ALEXA — PRIME DAY', sub: '', audio: 'audio/sfx_huge.mp3', vol: 0.5 },
];
const Montage: React.FC<{ m: typeof MONTAGE[number] }> = ({ m }) => {
  const f = useCurrentFrame(); const zoom = 1.06 + f * 0.0012;
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}><Shot name={m.shot} from={m.from} /></AbsoluteFill>
      <div style={{ position: 'absolute', left: 60, top: 120, transform: `translateX(${interpolate(f, [0, 8], [-900, 0], { extrapolateRight: 'clamp' })}px) skewX(-8deg)`, background: '#b30000', padding: '10px 26px', border: '4px solid #000', boxShadow: '8px 8px 0 #000' }}>
        <div style={{ fontFamily: press, fontSize: 22, color: '#ffd23f' }}>ULTIMATE</div>
        <div style={{ fontFamily: bungee, fontSize: 52, color: '#fff' }}>{m.label}</div>
      </div>
      {m.sub && <Sequence from={10}><Caption text={m.sub} size={28} y="80%" /></Sequence>}
      <Flash len={6} strength={0.5} />
      <Sfx src={m.audio} volume={m.vol ?? 1.1} fadeOutAt={m.len} />
      <CRT strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 5: comedic feature cards
const Feature: React.FC<{ shot: string; from: number; big: string; small: string; vo: string }> = ({ shot, from, big, small, vo }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 0, 12);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={{ filter: 'brightness(0.55) saturate(1.2)', transform: `scale(${1.1 - f * 0.0008})` }}><Shot name={shot} from={from} /></AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Chrome size={130} tone="gold" style={{ transform: `scale(${s})` }}>{big}</Chrome>
        <div style={{ marginTop: 40, fontFamily: press, fontSize: 34, color: '#fff', background: 'rgba(0,0,0,0.75)', padding: '14px 26px', opacity: interpolate(f, [8, 16], [0, 1], { extrapolateRight: 'clamp' }) }}>{small}</div>
      </AbsoluteFill>
      <Sfx src={vo} volume={1.1} /><Sfx src="audio/sfx_select.mp3" volume={0.5} />
      <Letterbox h={70} /><CRT strength={0.6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 6: the KO
const KO: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill><Shot name="ko" from={60} /></AbsoluteFill>
      <Sequence from={KO_AT}><Sfx src="audio/sfx_ko.mp3" /></Sequence>
      <Sequence from={KO_AT + 20}><Sfx src="audio/ko.mp3" volume={1.2} /></Sequence>
      <Sequence from={KO_AT + 60}><Sfx src="audio/f_claude_ko.mp3" volume={1} fadeOutAt={120} /></Sequence>
      <Sequence from={KO_AT + 60}><Caption text={line('f_claude_ko')} size={26} y="84%" /></Sequence>
      <CRT strength={0.5} />
    </AbsoluteFill>
  );
};
export const KO_AT = 48;   // the swarm's finishing blow lands at clip frame 108 (logged by shots.mjs); the scene starts at 60

// ---------------------------------------------------------------- scene 7: end card + post-credits Clippy
const End: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 0, 10);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%,#2a0a0a 0%,#050509 70%)', alignItems: 'center', justifyContent: 'center' }}>
      <Img src={staticFile('logo.png')} style={{ width: 1300, transform: `scale(${s}) rotate(-2deg)` }} />
      <div style={{ marginTop: 50, fontFamily: press, fontSize: 64, color: '#ffd23f', textShadow: '0 6px 0 #000', opacity: interpolate(f, [12, 20], [0, 1], { extrapolateRight: 'clamp' }) }}>TOKKEN.WIN</div>
      <div style={{ marginTop: 26, fontFamily: press, fontSize: 26, color: '#ddd', letterSpacing: 2, opacity: interpolate(f, [22, 30], [0, 1], { extrapolateRight: 'clamp' }) }}>FREE IN YOUR BROWSER • ONLINE PVP • OPEN SOURCE</div>
      <div style={{ position: 'absolute', bottom: 60, fontFamily: press, fontSize: 14, color: '#777' }}>A PARODY. NOT AFFILIATED WITH ANY OF THE COMPANIES DEPICTED. ALL TRADEMARKS BELONG TO THEIR OWNERS.</div>
      <Sfx src="audio/sfx_huge.mp3" volume={0.8} />
      <Sequence from={10}><Sfx src="vo/n09.mp3" volume={1.1} /></Sequence>
      <Sequence from={10 + dur('vo/n09.mp3') + 6}><Sfx src="vo/n10.mp3" volume={1.05} /></Sequence>
      <Flash len={12} /><CRT strength={0.5} />
    </AbsoluteFill>
  );
};
const Clippy: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 18, 9), d = pop(f, fps, 30, 12);
  return (
    <AbsoluteFill style={{ background: '#008080' }}>
      <Sprite id="clippy" pose="win" style={{ position: 'absolute', right: 150, bottom: interpolate(s, [0, 1], [-700, 40]), height: 640, filter: 'drop-shadow(10px 10px 0 rgba(0,0,0,0.35))' }} />
      <div style={{ position: 'absolute', left: 160, top: 170, width: 1000, background: '#ffffe1', border: '4px solid #000', borderRadius: 26, padding: 44, fontFamily: 'Tahoma, Verdana, sans-serif', fontSize: 50, lineHeight: 1.3, color: '#000', boxShadow: '12px 12px 0 rgba(0,0,0,0.35)', transform: `scale(${d})`, transformOrigin: '100% 100%' }}>
        It looks like you're trying to close this trailer!<br /><br />Would you like help?
        <div style={{ display: 'flex', gap: 24, marginTop: 36 }}>{['Yes', 'Also yes', 'Play TOKKEN'].map(b => <div key={b} style={{ background: '#c0c0c0', border: '4px outset #fff', padding: '12px 26px', fontSize: 38 }}>{b}</div>)}</div>
      </div>
      <Sequence from={24}><Sfx src="vo/clippy.mp3" volume={1.1} /></Sequence>
      <Sequence from={18}><Sfx src="audio/sfx_notif.mp3" /></Sequence>
      <CRT strength={0.4} />
    </AbsoluteFill>
  );
};
// ---------------------------------------------------------------- timeline
export const TIMELINE = (() => {
  const T: { at: number; len: number; el: React.ReactNode; music?: boolean }[] = []; let at = 0;
  const add = (len: number, el: React.ReactNode, music = true) => { T.push({ at, len, el, music }); at += len; };
  add(450, <Cold />, false);
  add(84, <Title />);
  CARDS.forEach(([id, arena, joke], i) => add(CARD_LEN, <Card id={id} arena={arena} joke={joke} i={i} />));
  add(96, <Grid />);
  MONTAGE.forEach(m => add(m.len, <Montage m={m} />));
  add(dur('vo/n06.mp3') + 14, <Feature shot="brawl" from={10} big="ROLLBACK NETCODE" small="SMOOTHER THAN A FUNDING ANNOUNCEMENT." vo="vo/n06.mp3" />);
  add(dur('vo/n07.mp3') + 14, <Feature shot="select" from={0} big="ONLINE PVP" small="INVITE A FRIEND. LOSE A FRIEND." vo="vo/n07.mp3" />);
  add(dur('vo/n08.mp3') + 12, <Feature shot="ult_cursor" from={40} big="PHONE • BROWSER • FREE" small="IT DOES NOT RUN THE TESTS." vo="vo/n08.mp3" />);
  add(140, <KO />);
  add(Math.max(210, 10 + dur('vo/n09.mp3') + 6 + dur('vo/n10.mp3') + 20), <End />);
  add(dur('vo/clippy.mp3') + 40, <Clippy />, false);
  return { T, total: at };
})();

export const Trailer: React.FC = () => {
  const musicStart = TIMELINE.T.find(t => t.music)!.at, musicEnd = TIMELINE.T.filter(t => t.music).slice(-1)[0];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {TIMELINE.T.map((t, i) => <Sequence key={i} from={t.at} durationInFrames={t.len}>{t.el}</Sequence>)}
      <Sequence from={musicStart} durationInFrames={musicEnd.at + musicEnd.len - musicStart}>
        <Audio src={staticFile('audio/music_battle.mp3')} volume={v => interpolate(v, [0, 4, musicEnd.at + musicEnd.len - musicStart - 40, musicEnd.at + musicEnd.len - musicStart], [0.55, 0.42, 0.42, 0], { extrapolateRight: 'clamp' })} />
      </Sequence>
    </AbsoluteFill>
  );
};
