import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { PENDING_TTL_MS, StreamController, type ControllerCard } from '../../src/controller';
import { writeRemembered } from '../../src/memory';
import { pushRecent } from '../../src/recents';
import type { StreamRequest } from '../../src/types';
import { readVolume } from '../../src/volume';

function fakeCard(target: string, live = true) {
  const card = {
    target,
    isLive: live,
    got: [] as StreamRequest[],
    commands: [] as StreamRequest[],
    stopped: 0,
    sleepChanges: 0,
    deliver(r: StreamRequest) {
      card.got.push(r);
    },
    stopFromController() {
      card.stopped++;
    },
    command(r: StreamRequest) {
      card.commands.push(r);
    },
    sleepChanged() {
      card.sleepChanges++;
    },
  };
  return card satisfies ControllerCard;
}

const press = (stream_card: unknown) =>
  window.dispatchEvent(
    new CustomEvent('ll-custom', { detail: { action: 'fire-dom-event', stream_card } }),
  );

describe('StreamController', () => {
  let c: StreamController;
  beforeEach(() => {
    localStorage.clear();
    c = new StreamController(window);
    c.install();
    history.replaceState(null, '', '/dash');
  });
  afterEach(() => {
    c.uninstall();
    vi.useRealTimers();
  });

  it('delivers straight to a live card with that target', () => {
    const tv = fakeCard('tv');
    const other = fakeCard('kitchen');
    c.register(tv);
    c.register(other);
    c.request({ target: 'tv', channel: 'a' });
    expect(tv.got).toHaveLength(1);
    expect(other.got).toHaveLength(0);
    expect(c.take('tv')).toBeUndefined();
  });

  it('keeps a request for a card that is not mounted yet', () => {
    c.request({ target: 'popup', channel: 'a' });
    expect(c.take('popup')).toMatchObject({ channel: 'a', target: 'popup' });
    expect(c.take('popup')).toBeUndefined();
  });

  it('ignores cards in preview', () => {
    const preview = fakeCard('tv', false);
    c.register(preview);
    c.request({ target: 'tv', channel: 'a' });
    expect(preview.got).toHaveLength(0);
    expect(c.take('tv')).toBeDefined();
  });

  it('expires pending requests', () => {
    vi.useFakeTimers();
    c.request({ target: 'popup', channel: 'a' });
    vi.advanceTimersByTime(PENDING_TTL_MS + 1);
    expect(c.take('popup')).toBeUndefined();
  });

  it('remembers the last channel per target until stopped', () => {
    const tv = fakeCard('tv');
    c.register(tv);
    c.request({ target: 'tv', channel: 'a' });
    expect(c.lastFor('tv')?.channel).toBe('a');
    c.stop('tv');
    expect(tv.stopped).toBe(1);
    expect(c.lastFor('tv')).toBeUndefined();
  });

  it('routes requests without a target to "default"', () => {
    const card = fakeCard('default');
    c.register(card);
    press({ channel: 'a' });
    expect(card.got[0].target).toBe('default');
  });

  it('handles fire-dom-event buttons, including stop', () => {
    const tv = fakeCard('tv');
    c.register(tv);
    press({ target: 'tv', channel: 'a' });
    press({ target: 'tv', action: 'stop' });
    expect(tv.got).toHaveLength(1);
    expect(tv.stopped).toBe(1);
  });

  it('ignores other fire-dom-event payloads and warns on invalid ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.dispatchEvent(new CustomEvent('ll-custom', { detail: { browser_mod: {} } }));
    expect(warn).not.toHaveBeenCalled();
    press({ target: 'tv' });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('opens a pop-up hash the way HA navigates', () => {
    const seen: string[] = [];
    const onNav = () => seen.push(location.hash);
    window.addEventListener('location-changed', onNav);
    c.request({ target: 'tv', channel: 'a', open: '#tv' });
    expect(location.pathname).toBe('/dash');
    expect(seen).toEqual(['#tv']);
    // Already open: no second navigation (Bubble would treat it as a close).
    c.request({ target: 'tv', channel: 'b', open: '#tv' });
    expect(seen).toEqual(['#tv']);
    window.removeEventListener('location-changed', onNav);
  });

  it('relays Fully Kiosk screen events', () => {
    const events: unknown[] = [];
    window.addEventListener('stream-card-power', (e) => events.push((e as CustomEvent).detail));
    c.onFullyEvent('screenOff');
    expect(c.power.screenOn).toBe(false);
    c.onFullyEvent('onScreensaverStart');
    c.onFullyEvent('screenOn');
    expect(events).toEqual([
      { screenOn: false, screensaver: false },
      { screenOn: false, screensaver: true },
      { screenOn: true, screensaver: true },
    ]);
  });

  it('binds Fully events when the Fully JS interface exists', () => {
    const bound: Record<string, string> = {};
    // happy-dom's window setters can write through to the real window; put it back afterwards.
    const realAdd = window.addEventListener;
    onTestFinished(() => {
      window.addEventListener = realAdd;
    });
    const win = Object.assign(Object.create(window), {
      fully: { bind: (e: string, code: string) => (bound[e] = code) },
      addEventListener: () => {},
    });
    new StreamController(win as Window).install();
    expect(Object.keys(bound).sort()).toEqual([
      'onScreensaverStart',
      'onScreensaverStop',
      'screenOff',
      'screenOn',
    ]);
    expect(bound.screenOff).toContain('onFullyEvent("screenOff")');
  });

  describe('navigation actions', () => {
    it('sends channel up/down, last channel, volume and mute to live cards', () => {
      const tv = fakeCard('tv');
      c.register(tv);
      for (const action of ['channel_up', 'channel_down', 'last_channel', 'mute', 'unmute']) {
        press({ target: 'tv', action });
      }
      press({ target: 'tv', action: 'volume', volume: 40 });
      expect(tv.commands.map((r) => r.action)).toEqual([
        'channel_up',
        'channel_down',
        'last_channel',
        'mute',
        'unmute',
        'volume',
      ]);
      expect(tv.got).toHaveLength(0);
      // Commands never replace the target's last channel.
      expect(c.lastFor('tv')).toBeUndefined();
    });

    it('remembers a volume set while no card is on the page', () => {
      press({ target: 'tv', action: 'volume', volume: 25 });
      expect(readVolume()).toBe(0.25);
    });

    it('keeps channel up/down in the mailbox for a card that mounts later', () => {
      press({ target: 'popup', action: 'channel_up', open: '#tv' });
      expect(c.take('popup')?.action).toBe('channel_up');
    });

    it('plays the previous recent for last channel when no card is on the page', () => {
      pushRecent('tv', { channel: 'aaa' });
      pushRecent('tv', { channel: 'bbb' });
      writeRemembered('tv', { channel: 'bbb', playing: true });
      press({ target: 'tv', action: 'last_channel' });
      expect(c.take('tv')).toMatchObject({ channel: 'aaa', action: 'play' });
    });

    it('rejects invalid sleep and volume payloads', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      press({ target: 'tv', action: 'sleep' });
      press({ target: 'tv', action: 'volume', volume: 101 });
      expect(warn).toHaveBeenCalledTimes(2);
      warn.mockRestore();
    });
  });

  describe('sleep timer', () => {
    it('stops the target when it runs out, with a warning first', () => {
      vi.useFakeTimers();
      const tv = fakeCard('tv');
      c.register(tv);
      c.request({ target: 'tv', channel: 'a' });
      press({ target: 'tv', action: 'sleep', sleep: 2 });
      expect(c.sleepFor('tv')).toMatchObject({ warning: false });
      expect(tv.sleepChanges).toBe(1);
      vi.advanceTimersByTime(60_000);
      expect(c.sleepFor('tv')?.warning).toBe(true);
      expect(tv.sleepChanges).toBe(2);
      expect(tv.stopped).toBe(0);
      vi.advanceTimersByTime(60_000);
      expect(tv.stopped).toBe(1);
      expect(c.sleepFor('tv')).toBeUndefined();
      expect(c.lastFor('tv')).toBeUndefined();
    });

    it('stops a target whose card is off the page, so it comes back stopped', () => {
      vi.useFakeTimers();
      writeRemembered('popup', { channel: 'a', playing: true });
      c.setSleep('popup', 1);
      vi.advanceTimersByTime(60_000);
      expect(c.stopCount('popup')).toBe(1);
      expect(JSON.parse(localStorage.getItem('stream-card:last:popup')!).playing).toBe(false);
    });

    it('cancels, extends, and is cancelled by a stop', () => {
      vi.useFakeTimers();
      c.setSleep('tv', 10);
      const end = c.sleepFor('tv')!.endsAt;
      c.extendSleep('tv', 30);
      expect(c.sleepFor('tv')!.endsAt).toBe(end + 30 * 60_000);
      press({ target: 'tv', action: 'sleep', sleep: 0 });
      expect(c.sleepFor('tv')).toBeUndefined();
      c.setSleep('tv', 10);
      c.stop('tv');
      expect(c.sleepFor('tv')).toBeUndefined();
      vi.advanceTimersByTime(11 * 60_000);
      expect(c.stopCount('tv')).toBe(1);
    });

    it('survives a reload, and one that ran out meanwhile stops on load', () => {
      vi.useFakeTimers();
      c.setSleep('tv', 5);
      const reloaded = new StreamController(window);
      expect(reloaded.sleepFor('tv')?.remainingMs).toBe(5 * 60_000);
      vi.setSystemTime(Date.now() + 6 * 60_000);
      const later = new StreamController(window);
      expect(later.sleepFor('tv')).toBeUndefined();
      expect(later.stopCount('tv')).toBe(1);
    });
  });
});
