import { describe, expect, it } from 'vitest';
import {
  channelLabel,
  countdown,
  detectLayout,
  initials,
  minutesLeft,
  progress,
} from '../../src/ui/view';

describe('view helpers', () => {
  it('measures how far through a programme we are', () => {
    expect(progress({ title: 'x', start: 1000, end: 3000 }, 2000)).toBe(50);
    expect(progress({ title: 'x', start: 1000, end: 3000 }, 0)).toBe(0);
    expect(progress({ title: 'x', start: 1000, end: 3000 }, 9000)).toBe(100);
    expect(progress({ title: 'x' }, 2000)).toBeUndefined();
    expect(progress(undefined, 2000)).toBeUndefined();
  });

  it('formats countdowns and minutes left', () => {
    expect(countdown(58_000)).toBe('0:58');
    expect(countdown(61_200)).toBe('1:02');
    expect(countdown(-5)).toBe('0:00');
    expect(minutesLeft(20 * 60_000)).toBe('20m');
    expect(minutesLeft(19 * 60_000 + 1)).toBe('20m');
    expect(minutesLeft(65 * 60_000)).toBe('1h 05m');
  });

  it('makes initials and labels', () => {
    expect(initials('Sports Live HD')).toBe('SL');
    expect(initials('news')).toBe('N');
    expect(channelLabel({ id: 'a', url: 'u', name: 'Pitch', number: '300' })).toBe('300 Pitch');
    expect(channelLabel({ id: 'a', url: 'u', name: 'Pitch' })).toBe('Pitch');
    expect(channelLabel(undefined)).toBe('');
  });

  it('gives cast receivers and TVs the 10-foot layout, tablets and phones the standard one', () => {
    expect(detectLayout('Mozilla/5.0 (X11; Linux armv7l) Chrome/120 CrKey/1.56.500000')).toBe('tv');
    expect(detectLayout('Mozilla/5.0 (Linux; Android 12; Chromecast) GoogleTV')).toBe('tv');
    expect(
      detectLayout('Mozilla/5.0 (Linux; Android 9; KFONWI) AppleWebKit Chrome/120 Safari'),
    ).toBe('standard');
    expect(detectLayout('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('standard');
  });
});
