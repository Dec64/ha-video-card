import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  guessSourceType,
  isUuid,
  needsLookup,
  normalizeConfig,
  parseAspectRatio,
  parseRequest,
  resolveSource,
} from '../../src/config';

const base = { type: 'custom:stream-card', dispatcharr_url: 'https://dispatcharr.example/' };

describe('normalizeConfig', () => {
  it('applies defaults', () => {
    const c = normalizeConfig(base);
    expect(c).toMatchObject({
      target: 'default',
      dispatcharrUrl: 'https://dispatcharr.example',
      urlTemplate: '{base}/proxy/ts/stream/{channel}',
      autoplay: true,
      muted: false,
      aspectRatio: '16 / 9',
      idleTimeoutMs: 0,
      startTimeoutMs: 20_000,
      maxReconnectAttempts: 5,
      debug: false,
    });
  });

  it('reads every option', () => {
    const c = normalizeConfig({
      ...base,
      target: 'kitchen',
      output_profile: 2,
      aspect_ratio: '4:3',
      idle_timeout: 10,
      start_timeout: 5,
      reconnect: { max_attempts: 2 },
      muted: true,
      autoplay: false,
      debug: true,
    });
    expect(c).toMatchObject({
      target: 'kitchen',
      outputProfile: '2',
      aspectRatio: '4 / 3',
      idleTimeoutMs: 600_000,
      startTimeoutMs: 5000,
      maxReconnectAttempts: 2,
      muted: true,
      autoplay: false,
      debug: true,
    });
  });

  it.each([
    [{ dispatcharr_url: 'dispatcharr.local' }, 'full URL'],
    [{ dispatcharr_url: 'ftp://x' }, 'http'],
    [{ output_profile: 'aac' }, 'numeric ID'],
    [{ url_template: 'https://x/stream' }, '{channel}'],
    [{ aspect_ratio: 'wide' }, 'aspect_ratio'],
    [{ idle_timeout: -1 }, 'idle_timeout'],
    [{ autoplay: 'yes' }, 'autoplay'],
    [{ reconnect: 3 }, 'reconnect'],
  ])('rejects %j with a readable message', (extra, msg) => {
    expect(() => normalizeConfig({ ...base, ...extra })).toThrow(ConfigError);
    expect(() => normalizeConfig({ ...base, ...extra })).toThrow(msg);
  });

  it('rejects a default channel without dispatcharr_url', () => {
    expect(() => normalizeConfig({ type: 'x', channel: 'abc' })).toThrow('dispatcharr_url');
  });

  it('allows a card without dispatcharr_url that only gets full URLs', () => {
    expect(() => normalizeConfig({ type: 'x' })).not.toThrow();
  });
});

describe('resolveSource', () => {
  const cfg = normalizeConfig({ ...base, output_profile: 2 });

  it('builds a Dispatcharr TS URL with the output profile', () => {
    expect(resolveSource({ channel: 'de52-8019', title: 'BBC' }, cfg)).toEqual({
      url: 'https://dispatcharr.example/proxy/ts/stream/de52-8019?output_profile=2',
      type: 'mpegts',
      title: 'BBC',
      channel: 'de52-8019',
    });
  });

  it('keeps a query already in the template', () => {
    const c = normalizeConfig({
      ...base,
      output_profile: 3,
      url_template: '{base}/ts/{channel}?x=1',
    });
    expect(resolveSource({ channel: 'a' }, c).url).toBe(
      'https://dispatcharr.example/ts/a?x=1&output_profile=3',
    );
  });

  it('does not override an output_profile in the template', () => {
    const c = normalizeConfig({
      ...base,
      output_profile: 3,
      url_template: '{base}/ts/{channel}?output_profile=9',
    });
    expect(resolveSource({ channel: 'a' }, c).url).toContain('output_profile=9');
  });

  it('uses a full url as given', () => {
    const s = resolveSource({ url: 'https://cdn.example/live/x.m3u8' }, cfg);
    expect(s).toMatchObject({ url: 'https://cdn.example/live/x.m3u8', type: 'native' });
  });

  it.each(['a/b', 'a b', 'a?b', ''])('rejects channel %j', (ch) => {
    expect(() => resolveSource({ channel: ch }, cfg)).toThrow(ConfigError);
  });
});

describe('helpers', () => {
  it('guesses source types', () => {
    expect(guessSourceType('https://x/proxy/ts/stream/abc')).toBe('mpegts');
    expect(guessSourceType('https://x/a.m3u8?token=1')).toBe('native');
    expect(guessSourceType('https://x/a.MP4')).toBe('native');
  });

  it('parses aspect ratios', () => {
    expect(parseAspectRatio('21/9')).toBe('21 / 9');
    expect(parseAspectRatio('1.5')).toBe('1.5');
    expect(parseAspectRatio(undefined)).toBe('16 / 9');
  });

  it('validates button payloads', () => {
    expect(parseRequest({ target: 'tv', channel: 'abc', open: '#tv' })).toEqual({
      target: 'tv',
      action: 'play',
      channel: 'abc',
      url: undefined,
      type: undefined,
      title: undefined,
      open: '#tv',
    });
    expect(parseRequest({ target: 'tv', action: 'stop' })?.action).toBe('stop');
    expect(parseRequest({ target: 'tv' })).toBeUndefined();
    expect(parseRequest({ channel: 'a', action: 'rewind' })).toBeUndefined();
    expect(parseRequest('abc')).toBeUndefined();
  });
});

describe('channel list options', () => {
  it('defaults the channel list on, from dispatcharr_url', () => {
    const c = normalizeConfig(base);
    expect(c).toMatchObject({
      channelList: true,
      m3uUrl: 'https://dispatcharr.example/output/m3u',
      channelGroups: [],
      favourites: [],
      rememberChannel: true,
    });
  });

  it('is off without a Dispatcharr URL or M3U URL', () => {
    const c = normalizeConfig({ type: 'custom:stream-card', url: 'https://x.example/a.ts' });
    expect(c.channelList).toBe(false);
    expect(c.m3uUrl).toBeUndefined();
  });

  it('reads groups, favourites and an explicit M3U URL', () => {
    const c = normalizeConfig({
      ...base,
      channel_list: true,
      m3u_url: 'https://lists.example/my.m3u',
      channel_groups: ['News', ' UK '],
      favourites: ['BBC One', 101],
      remember_channel: false,
    });
    expect(c).toMatchObject({
      m3uUrl: 'https://lists.example/my.m3u',
      channelGroups: ['News', 'UK'],
      favourites: ['BBC One', '101'],
      rememberChannel: false,
    });
  });

  it('accepts a single string for list options', () => {
    expect(normalizeConfig({ ...base, channel_groups: 'News' }).channelGroups).toEqual(['News']);
  });

  it('rejects bad values', () => {
    expect(() => normalizeConfig({ ...base, m3u_url: 'not a url' })).toThrow(ConfigError);
    expect(() =>
      normalizeConfig({
        type: 'custom:stream-card',
        channel_list: true,
        url_template: 'http://x.example/{channel}',
      }),
    ).toThrow('"channel_list" needs "dispatcharr_url" or "m3u_url"');
    expect(() => normalizeConfig({ ...base, favourites: [{ a: 1 }] })).toThrow(ConfigError);
  });

  it('accepts a channel name or number as the default when the list is on', () => {
    expect(normalizeConfig({ ...base, channel: 'BBC One HD' }).defaultRequest?.channel).toBe(
      'BBC One HD',
    );
    expect(normalizeConfig({ ...base, channel: '101' }).defaultRequest?.channel).toBe('101');
    expect(() => normalizeConfig({ ...base, channel_list: false, channel: 'BBC One HD' })).toThrow(
      ConfigError,
    );
  });
});

describe('isUuid / needsLookup', () => {
  it('tells IDs from names and numbers', () => {
    expect(isUuid('3F2B9C1E-7A4D-4E8B-9C2F-1D5E6A7B8C9D')).toBe(true);
    expect(isUuid('BBC One')).toBe(false);
    expect(needsLookup('BBC One HD')).toBe(true);
    expect(needsLookup('101')).toBe(true);
    expect(needsLookup('3f2b9c1e-7a4d-4e8b-9c2f-1d5e6a7b8c9d')).toBe(false);
    expect(needsLookup('ok--abc')).toBe(false);
  });
});

describe('buffer', () => {
  it('defaults to low and accepts stable', () => {
    expect(normalizeConfig(base).buffer).toBe('low');
    expect(normalizeConfig({ ...base, buffer: 'stable' }).buffer).toBe('stable');
    expect(() => normalizeConfig({ ...base, buffer: 'huge' })).toThrow(ConfigError);
  });
});
