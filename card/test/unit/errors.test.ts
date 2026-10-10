import { describe, expect, it } from 'vitest';
import { checkCodecs, codecName, isRetryable, toPlaybackError } from '../../src/errors';

describe('errors', () => {
  it('names codecs', () => {
    expect(codecName('avc1.640028')).toBe('H.264');
    expect(codecName('hvc1.1.6.L93')).toBe('HEVC (H.265)');
    expect(codecName('mp4a.40.2')).toBe('AAC');
    expect(codecName('ac-3')).toBe('AC-3 (Dolby Digital)');
    expect(codecName('ec-3')).toBe('E-AC-3 (Dolby Digital Plus)');
    expect(codecName('weird')).toBe('weird');
  });

  it('checks codecs against the device', () => {
    const device = (m: string) => /avc1|mp4a/.test(m);
    expect(checkCodecs({ videoCodec: 'avc1.64', audioCodec: 'mp4a.40.2' }, device)).toBeUndefined();
    expect(checkCodecs({ videoCodec: 'avc1.64', audioCodec: 'ac-3' }, device)?.message).toContain(
      'AC-3',
    );
    expect(
      checkCodecs({ videoCodec: 'hvc1.1', audioCodec: 'mp4a.40.2' }, device)?.message,
    ).toContain('HEVC');
  });

  it('decides what to retry', () => {
    expect(isRetryable({ kind: 'network', detail: '' })).toBe(true);
    expect(isRetryable({ kind: 'stall', detail: '' })).toBe(true);
    expect(isRetryable({ kind: 'http', status: 503, detail: '' })).toBe(true);
    expect(isRetryable({ kind: 'http', status: 404, detail: '' })).toBe(false);
    expect(isRetryable({ kind: 'cors', detail: '' })).toBe(false);
    expect(isRetryable({ kind: 'codec', detail: '' })).toBe(false);
    expect(isRetryable({ kind: 'timeout', detail: '' })).toBe(false);
  });

  it('writes messages people can act on', () => {
    expect(toPlaybackError({ kind: 'http', status: 404, detail: '' }).message).toContain('404');
    expect(toPlaybackError({ kind: 'http', status: 403, detail: '' }).message).toContain(
      'refused the stream (403)',
    );
    expect(
      toPlaybackError({ kind: 'timeout', detail: '' }, { startTimeoutMs: 20000 }).message,
    ).toContain('20 s');
    expect(
      toPlaybackError({ kind: 'codec', track: 'audio', codec: 'ac-3', detail: '' }).message,
    ).toContain('AC-3 (Dolby Digital) audio');
    expect(toPlaybackError({ kind: 'stall', detail: '' }, { attempts: 6 }).message).toContain('6');
  });
});
