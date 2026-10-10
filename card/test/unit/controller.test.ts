import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PENDING_TTL_MS, StreamController, type ControllerCard } from '../../src/controller';
import type { StreamRequest } from '../../src/types';

function fakeCard(target: string, live = true) {
  const card = {
    target,
    isLive: live,
    got: [] as StreamRequest[],
    stopped: 0,
    deliver(r: StreamRequest) {
      card.got.push(r);
    },
    stopFromController() {
      card.stopped++;
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
});
