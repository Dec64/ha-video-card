import type { SourceType } from '../types';
import { NativeEngine } from './native-engine';
import type { Engine } from './types';

export type EngineFactory = (type: SourceType, opts: { debug: boolean }) => Promise<Engine>;

/** mpegts.js is a separate chunk, loaded the first time a TS stream plays. */
export const createEngine: EngineFactory = async (type, { debug }) => {
  if (type === 'native') return new NativeEngine();
  const { MpegtsEngine } = await import('./mpegts-engine');
  return new MpegtsEngine(debug);
};
