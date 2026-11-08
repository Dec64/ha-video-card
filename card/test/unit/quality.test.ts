import { afterEach, describe, expect, it } from 'vitest';
import { ConfigError, heightFromName, normalizeConfig, resolveSource } from '../../src/config';
import {
  CHANNEL_INFO_MAX,
  QUALITY_HOLDS_MS,
  channelOptions,
  droppingFrames,
  maybeStepUp,
  pickOption,
  readAutoQuality,
  readChannelInfo,
  stepDown,
  writeAutoQuality,
  writeChannelInfo,
  type AutoQuality,
} from '../../src/quality';

const base = { type: 'custom:stream-card', dispatcharr_url: 'https://dispatcharr.example' };
const LADDER = [
  { name: '360p', output_profile: 16 },
  { name: '2160p', output_profile: 11 },
  { name: '1080p', output_profile: 13 },
  { name: '720p', output_profile: 14 },
];

describe('qualities config', () => {
  it('without qualities, Source keeps the card output_profile (as before)', () => {
    const c = normalizeConfig({ ...base, output_profile: 5 });
    expect(c.qualities).toEqual([{ name: 'Source', outputProfile: '5' }]);
    expect(c.formatProfile).toBeUndefined();
  });

  it('puts Source (no profile) first and sorts the rest best first', () => {
    const c = normalizeConfig({ ...base, output_profile: 5, qualities: LADDER });
    expect(c.qualities.map((r) => [r.name, r.outputProfile, r.height])).toEqual([
      ['Source', undefined, undefined],
      ['2160p', '11', 2160],
      ['1080p', '13', 1080],
      ['720p', '14', 720],
      ['360p', '16', 360],
    ]);
    expect(c.formatProfile).toBe('5');
  });

  it('rejects bad entries', () => {
    expect(() => normalizeConfig({ ...base, qualities: 'yes' })).toThrow(ConfigError);
    expect(() => normalizeConfig({ ...base, qualities: [{ name: '720p' }] })).toThrow(/needs/);
    expect(() =>
      normalizeConfig({ ...base, qualities: [{ name: 'Source', output_profile: 1 }] }),
    ).toThrow(/twice/);
    expect(() =>
      normalizeConfig({ ...base, qualities: [{ name: 'x', output_profile: 'abc' }] }),
    ).toThrow(/numeric/);
  });

  it('reads heights from names', () => {
    expect(heightFromName('720p')).toBe(720);
    expect(heightFromName('4K HDR')).toBe(2160);
    expect(heightFromName('Low')).toBeUndefined();
  });

  it('Source plays with no output_profile in the URL', () => {
    const c = normalizeConfig({ ...base, output_profile: 5, qualities: LADDER });
    const url = resolveSource({ channel: 'abc' }, { ...c, outputProfile: undefined }).url;
    expect(url).toBe('https://dispatcharr.example/proxy/ts/stream/abc');
  });
});

describe('quality options', () => {
  afterEach(() => localStorage.clear());
  const ladder = normalizeConfig({ ...base, output_profile: 5, qualities: LADDER }).qualities;

  it('offers every rung until the source height is known, then only lower ones', () => {
    expect(channelOptions(ladder, {}, '5').map((o) => o.name)).toEqual([
      'Source',
      '2160p',
      '1080p',
      '720p',
      '360p',
    ]);
    expect(channelOptions(ladder, { h: 1080 }, '5').map((o) => o.name)).toEqual([
      'Source',
      '720p',
      '360p',
    ]);
  });

  it('Source uses the format profile once a channel needs it', () => {
    expect(channelOptions(ladder, { fmt: true }, '5')[0].outputProfile).toBe('5');
    expect(channelOptions(ladder, {}, '5')[0].outputProfile).toBeUndefined();
  });

  it('picks a pinned quality, else Auto, never Source when it cannot play', () => {
    const opts = channelOptions(ladder, { h: 1080 }, '5');
    const auto: AutoQuality = { step: 1, until: 0, strikes: 0, since: 0 };
    expect(pickOption(opts, undefined, auto, {})).toBe(1);
    expect(pickOption(opts, '360p', auto, {})).toBe(2);
    expect(pickOption(opts, '2160p', auto, {})).toBe(0); // hidden above source → Source
    expect(pickOption(opts, undefined, { ...auto, step: 9 }, {})).toBe(2);
    expect(pickOption(opts, 'Source', auto, { noSource: true })).toBe(1);
  });

  it('steps down with longer holds on repeat, and up again after the hold', () => {
    const t = 3 * 24 * 60 * 60_000;
    let q = stepDown(readAutoQuality(), 0, 3, t);
    expect(q).toEqual({ step: 1, until: t + QUALITY_HOLDS_MS[0], strikes: 1, since: t });
    q = stepDown(q, 1, 3, t + 1000);
    expect(q.step).toBe(2);
    expect(q.until).toBe(t + 1000 + QUALITY_HOLDS_MS[1]);
    expect(stepDown(q, 3, 3, t + 2000).step).toBe(3);
    expect(maybeStepUp(q, t + 2000)).toBe(q); // still holding
    const up = maybeStepUp(q, q.until);
    expect(up.step).toBe(1);
    expect(up.strikes).toBe(2);
    writeAutoQuality(up);
    expect(readAutoQuality()).toEqual(up);
  });

  it('remembers channels, forgetting the oldest beyond the limit', () => {
    writeChannelInfo('a', { h: 1080 });
    writeChannelInfo('a', { fmt: true });
    expect(readChannelInfo('a')).toEqual({ h: 1080, fmt: true });
    for (let i = 0; i < CHANNEL_INFO_MAX; i++) writeChannelInfo(`c${i}`, { h: 720 });
    expect(readChannelInfo('a')).toEqual({});
    expect(readChannelInfo(`c${CHANNEL_INFO_MAX - 1}`)).toEqual({ h: 720 });
  });

  it('spots a device dropping frames', () => {
    const ok = { decoded: 50, dropped: 2 };
    const bad = { decoded: 50, dropped: 20 };
    expect(droppingFrames([bad, bad, bad, bad])).toBe(false); // not enough samples yet
    expect(droppingFrames([bad, bad, bad, bad, bad])).toBe(true);
    expect(droppingFrames([ok, ok, ok, ok, ok])).toBe(false);
    expect(droppingFrames(Array(5).fill({ decoded: 10, dropped: 9 }))).toBe(false); // too few
  });
});
