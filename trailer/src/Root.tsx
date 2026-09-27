import React from 'react';
import { Composition } from 'remotion';
import { Trailer, TIMELINE } from './Trailer';
import { Vertical, VERTICAL } from './Vertical';

export const Root: React.FC = () => (<>
  <Composition id="Trailer" component={Trailer} durationInFrames={TIMELINE.total} fps={30} width={1920} height={1080} />
  <Composition id="Vertical" component={Vertical} durationInFrames={VERTICAL.total} fps={30} width={1080} height={1920} />
</>);
