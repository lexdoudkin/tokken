import React from 'react';
import { Composition } from 'remotion';
import { Trailer, TIMELINE } from './Trailer';
import { Vertical, VERTICAL } from './Vertical';
import { HP, Absolutely, PickMain, InAWorld, LEN } from './Shorts';

export const Root: React.FC = () => (<>
  <Composition id="Trailer" component={Trailer} durationInFrames={TIMELINE.total} fps={30} width={1920} height={1080} />
  <Composition id="Vertical" component={Vertical} durationInFrames={VERTICAL.total} fps={30} width={1080} height={1920} />
  {([['HP', HP], ['Absolutely', Absolutely], ['PickMain', PickMain], ['InAWorld', InAWorld]] as const).map(([id, C]) => (<React.Fragment key={id}>
    <Composition id={`${id}-9x16`} component={C} durationInFrames={LEN[id]} fps={30} width={1080} height={1920} />
    <Composition id={`${id}-16x9`} component={C} durationInFrames={LEN[id]} fps={30} width={1920} height={1080} />
  </React.Fragment>))}
</>);
