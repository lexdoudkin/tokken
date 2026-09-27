import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { CRT, Chrome, Flash, Sfx, Shot, bungee, dur, pop, press, useShake, useVideoConfig } from './lib';

// 9:16 cut: footage in the middle band over a blurred copy of itself, big captions above/below.
const Band: React.FC<{ shot: string; from: number; top: string; bottom?: string; color?: string }> = ({ shot, from, top, bottom, color = '#ffd23f' }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 0, 12);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ filter: 'blur(28px) brightness(0.45) saturate(1.4)', transform: 'scale(1.3)' }}><Shot name={shot} from={from} /></AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, height: 1000, overflow: 'hidden', borderTop: '6px solid #000', borderBottom: '6px solid #000' }}><div style={{ width: '100%', height: '100%', transform: `scale(${1.02 + f * 0.001})` }}><Shot name={shot} from={from} style={{ objectFit: 'cover' }} /></div></div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 170, textAlign: 'center', transform: `scale(${s})` }}>
        <div style={{ fontFamily: bungee, fontSize: 92, lineHeight: 1.05, color: '#fff', WebkitTextStroke: '5px #000', textShadow: '0 8px 0 #000', fontStyle: 'italic' }}>{top}</div>
      </div>
      {bottom && <div style={{ position: 'absolute', left: 70, right: 70, top: 1600, textAlign: 'center', fontFamily: press, fontSize: 38, lineHeight: 1.5, color, textShadow: '0 5px 0 #000', opacity: interpolate(f, [6, 12], [0, 1], { extrapolateRight: 'clamp' }) }}>{bottom}</div>}
      <Flash len={5} strength={0.5} />
      <CRT strength={0.5} />
    </AbsoluteFill>
  );
};

const CUTS: { shot: string; from: number; top: string; bottom: string; len: number; sfx: string }[] = [
  { shot: 'ult_jev', from: 70, top: 'JEV ONLY SPEAKS JSON', bottom: '{"you": "lose"}', len: 54, sfx: 'audio/v_jev_ult.mp3' },
  { shot: 'ult_deepseek', from: 62, top: 'DEEPSEEK COPIES YOUR ULT', bottom: 'FOR 1% OF THE PRICE', len: 54, sfx: 'audio/sfx_huge.mp3' },
  { shot: 'ult_codex', from: 64, top: 'CODEX SHIPS TO PROD', bottom: 'ON A FRIDAY. NO TESTS.', len: 54, sfx: 'audio/sfx_huge.mp3' },
  { shot: 'ult_kimi', from: 38, top: 'KIMI DROPS THE MOON', bottom: 'THE ENTIRE MOON', len: 48, sfx: 'audio/sfx_huge.mp3' },
  { shot: 'ult_mistral', from: 62, top: 'MISTRAL GOES ON STRIKE', bottom: 'MID-FIGHT', len: 48, sfx: 'audio/sfx_huge.mp3' },
  { shot: 'ult_qwen', from: 64, top: 'QWEN RELEASES A TSUNAMI', bottom: 'NEW MODEL EVERY WEEK', len: 48, sfx: 'audio/sfx_huge.mp3' },
  { shot: 'ult_hermes', from: 64, top: 'HERMES "GROWS WITH YOU"', bottom: 'LIKE A FUNGUS', len: 45, sfx: 'audio/sfx_huge.mp3' },
  { shot: 'ult_manus', from: 60, top: 'MANUS OPENS 47 TABS', bottom: 'YOU CANNOT CLOSE THEM', len: 45, sfx: 'audio/sfx_huge.mp3' },
];

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000', transform: useShake([2], 18, 10) }}>
      <Band shot="ult_openclaw" from={60} top="AI MODELS, BUT THEY FIGHT" bottom="HP IS TOKENS" />
      <Sfx src="vo/v01.mp3" volume={1.15} />
      <Sfx src="audio/sfx_huge.mp3" volume={0.6} />
      {f < 3 && <AbsoluteFill style={{ background: '#fff' }} />}
    </AbsoluteFill>
  );
};
const LogoV: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 0, 9);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center,#3a0808 0%,#07070d 70%)', alignItems: 'center', justifyContent: 'center', transform: useShake([0], 26, 12) }}>
      <Img src={staticFile('logo.png')} style={{ width: 1000, transform: `scale(${interpolate(s, [0, 1], [2.6, 1])}) rotate(-3deg)` }} />
      <Sfx src="audio/title.mp3" volume={1.2} /><Sfx src="audio/sfx_huge.mp3" volume={0.8} /><Flash len={10} /><CRT />
    </AbsoluteFill>
  );
};
const EndV: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(); const s = pop(f, fps, 0, 10);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%,#2a0a0a 0%,#050509 70%)', alignItems: 'center', justifyContent: 'center' }}>
      <Img src={staticFile('logo.png')} style={{ width: 960, transform: `scale(${s}) rotate(-3deg)` }} />
      <Chrome size={96} tone="gold" style={{ marginTop: 70, fontFamily: press, fontStyle: 'normal' }}>TOKKEN.WIN</Chrome>
      <div style={{ marginTop: 50, fontFamily: press, fontSize: 34, color: '#fff', textAlign: 'center', lineHeight: 1.7 }}>22 AGENTS • ONLINE PVP<br />FREE IN YOUR BROWSER</div>
      <Sequence from={6}><Sfx src="vo/n09.mp3" volume={1.1} /></Sequence>
      <Flash len={10} /><CRT strength={0.5} />
    </AbsoluteFill>
  );
};

export const VERTICAL = (() => {
  const T: { at: number; len: number; el: React.ReactNode }[] = []; let at = 0;
  const add = (len: number, el: React.ReactNode) => { T.push({ at, len, el }); at += len; };
  add(Math.max(120, dur('vo/v01.mp3') + 8), <Hook />);
  add(54, <LogoV />);
  CUTS.forEach(c => add(c.len, <><Band shot={c.shot} from={c.from} top={c.top} bottom={c.bottom} /><Sfx src={c.sfx} volume={0.9} fadeOutAt={c.len} /></>));
  add(Math.max(120, dur('vo/n09.mp3') + 40), <EndV />);
  return { T, total: at };
})();

export const Vertical: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {VERTICAL.T.map((t, i) => <Sequence key={i} from={t.at} durationInFrames={t.len}>{t.el}</Sequence>)}
    <Sequence from={VERTICAL.T[1].at}><Audio src={staticFile('audio/music_battle.mp3')} volume={v => interpolate(v, [0, VERTICAL.total - VERTICAL.T[1].at - 30, VERTICAL.total - VERTICAL.T[1].at], [0.5, 0.5, 0], { extrapolateRight: 'clamp' })} /></Sequence>
    <Audio src={staticFile('audio/music_title.mp3')} volume={v => interpolate(v, [0, VERTICAL.T[1].at], [0.25, 0], { extrapolateRight: 'clamp' })} />
  </AbsoluteFill>
);
