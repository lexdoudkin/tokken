import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, random } from 'remotion';
import { loadFont as loadBungee } from '@remotion/google-fonts/Bungee';
import { loadFont as loadPress } from '@remotion/google-fonts/PressStart2P';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadRusso } from '@remotion/google-fonts/RussoOne';
import DUR from './durations.json';
import LINES from './lines.json';
import FIGHTERS from './fighters.json';

export const bungee = loadBungee().fontFamily;
export const press = loadPress().fontFamily;
export const cinzel = loadCinzel().fontFamily;
export const russo = loadRusso().fontFamily;
export const FPS = 30;
export const F = FIGHTERS as { roster: string[]; f: Record<string, { name: string; title: string; color: string; special: string; ult: string; secret: boolean; isNew: boolean }> };

/** duration (frames) of a public/ audio file */
export const dur = (path: string) => Math.ceil(((DUR as Record<string, number>)[path] ?? 2) * FPS);
export const line = (key: string) => (LINES as Record<string, string>)[key] ?? '';

/** gold/silver chrome lettering like the game's title text */
export const Chrome: React.FC<{ children: React.ReactNode; size: number; tone?: 'gold' | 'silver' | 'red'; style?: React.CSSProperties; font?: string }> = ({ children, size, tone = 'gold', style, font }) => {
  const g = tone === 'gold' ? 'linear-gradient(180deg,#fff7c4 0%,#ffd23f 45%,#a8660a 52%,#ffe27a 70%,#fff3b0 100%)'
    : tone === 'red' ? 'linear-gradient(180deg,#ffd0d0 0%,#ff3b3b 45%,#7a0000 52%,#ff5a5a 75%,#ffb0b0 100%)'
    : 'linear-gradient(180deg,#ffffff 0%,#d8dde8 45%,#5b6272 52%,#e8ecf5 75%,#ffffff 100%)';
  return <div style={{ fontFamily: font ?? bungee, fontSize: size, lineHeight: 1, background: g, WebkitBackgroundClip: 'text', color: 'transparent', WebkitTextStroke: `${Math.max(2, size / 22)}px #000`, filter: `drop-shadow(0 ${size / 16}px 0 #000) drop-shadow(0 0 ${size / 6}px rgba(255,180,40,0.35))`, fontStyle: 'italic', whiteSpace: 'nowrap', ...style }}>{children}</div>;
};

/** white flash that decays */
export const Flash: React.FC<{ at?: number; len?: number; color?: string; strength?: number }> = ({ at = 0, len = 8, color = '#fff', strength = 1 }) => {
  const f = useCurrentFrame(); const o = interpolate(f, [at, at + len], [strength, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return f < at ? null : <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: 'screen' }} />;
};

/** screen shake offset for impacts */
export const useShake = (hits: number[], amp = 22, len = 12) => {
  const f = useCurrentFrame(); let x = 0, y = 0;
  for (const h of hits) { const t = f - h; if (t >= 0 && t < len) { const k = (1 - t / len) * amp; x += (random(`sx${h}-${t}`) - 0.5) * 2 * k; y += (random(`sy${h}-${t}`) - 0.5) * 2 * k; } }
  return `translate(${x}px, ${y}px)`;
};

/** CRT scanlines + vignette, the game's look */
export const CRT: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 2px, transparent 4px)', opacity: strength }} />
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)', opacity: strength }} />
  </AbsoluteFill>
);

export const Letterbox: React.FC<{ h?: number }> = ({ h = 90 }) => (<>
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, background: '#000' }} />
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: '#000' }} />
</>);

/** game footage clip */
export const Shot: React.FC<{ name: string; from?: number; style?: React.CSSProperties; rate?: number }> = ({ name, from = 0, style, rate = 1 }) => (
  <OffthreadVideo src={staticFile(`shots/${name}.mp4`)} startFrom={from} playbackRate={rate} muted style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
);

export const Sprite: React.FC<{ id: string; pose?: string; style?: React.CSSProperties }> = ({ id, pose = 'win', style }) =>
  <Img src={staticFile(`sprites/${id}/${pose}.webp`)} style={{ imageRendering: 'pixelated', ...style }} />;

/** a sound effect / voice clip that fades out if its sequence is shorter than the file */
export const Sfx: React.FC<{ src: string; volume?: number; fadeOutAt?: number }> = ({ src, volume = 1, fadeOutAt }) => (
  <Audio src={staticFile(src)} volume={f => (fadeOutAt === undefined ? volume : volume * interpolate(f, [fadeOutAt - 8, fadeOutAt], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))} />
);

/** subtitle / caption box */
export const Caption: React.FC<{ text: string; size?: number; y?: number | string; color?: string; bg?: string }> = ({ text, size = 34, y = '82%', color = '#fff', bg = 'rgba(0,0,0,0.72)' }) => {
  const f = useCurrentFrame(); const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  return <div style={{ position: 'absolute', left: '50%', top: y, transform: 'translateX(-50%)', maxWidth: '86%', padding: '14px 26px', background: bg, color, fontFamily: press, fontSize: size, lineHeight: 1.45, textAlign: 'center', opacity: o, border: '3px solid #000', boxShadow: '0 6px 0 #000' }}>{text}</div>;
};

export const pop = (frame: number, fps: number, delay = 0, damping = 11) => spring({ frame: frame - delay, fps, config: { damping, stiffness: 180, mass: 0.7 } });
export { useVideoConfig };
