import { html, nothing, type TemplateResult } from 'lit';
import type { Channel } from '../channels';
import { icon } from '../icons';
import {
  channelLabel,
  clock,
  countdown,
  initials,
  minutesLeft,
  progress,
  type CardActions,
  type CardView,
} from './view';

/**
 * Templates for everything on and around the picture: the channel ident, the big channel
 * number, the state layers and the control bar. Pure functions of CardView + CardActions.
 */

const SLEEP_OPTIONS = [0, 15, 30, 60, 90];

const showImg = (e: Event) => ((e.target as HTMLImageElement).hidden = false);
const hideImg = (e: Event) => ((e.target as HTMLImageElement).hidden = true);

/** A channel's logo on a dark plate, or its initials when there's no logo or it fails. */
export function logo(ch: Channel | undefined, name: string | undefined, cls = ''): TemplateResult {
  const label = ch?.name ?? name ?? '';
  return html`<span class="logo ${cls}" aria-hidden="true">
    ${
      ch?.logo
        ? html`<img src=${ch.logo} alt="" decoding="async" @load=${showImg} @error=${hideImg} />`
        : nothing
    }
    <span class="ini">${initials(label) || '▶'}</span>
  </span>`;
}

function bar(pct: number | undefined, cls = ''): TemplateResult | typeof nothing {
  if (pct === undefined) return nothing;
  return html`<span class="bar ${cls}"><span style="width:${pct.toFixed(1)}%"></span></span>`;
}

/** Top-left: logo, number, name, what's on now and how far through it is. */
export function renderIdent(v: CardView): TemplateResult | typeof nothing {
  const ch = v.channel;
  const name = v.title ?? ch?.name;
  if (!name && v.ui !== 'playing') return nothing;
  if (v.ui === 'preview' || v.ui === 'empty') return nothing;
  const now = v.nowNext?.now;
  const next = v.nowNext?.next;
  return html`<div class="ident ${v.chrome ? '' : 'hidden'}">
    ${logo(ch, name, 'ident-logo')}
    <div class="ident-text">
      <div class="ident-line">
        ${ch?.number ? html`<span class="ident-num mono">${ch.number}</span>` : nothing}
        <span class="title">${name ?? 'Live'}</span>
      </div>
      ${now ? html`<div class="ident-now">${now.title}</div>` : nothing}
      ${
        now?.start && now.end
          ? html`<div class="ident-times mono">
              <span>${clock(now.start)}</span>${bar(progress(now, v.now))}<span
                >${clock(now.end)}</span
              >
            </div>`
          : nothing
      }
      ${
        next
          ? html`<div class="ident-next">
              Next${next.start ? html` <span class="mono">${clock(next.start)}</span>` : nothing}:
              ${next.title}
            </div>`
          : nothing
      }
    </div>
  </div>`;
}

/** Top-right chips: the sleep timer while it runs, and LIVE. */
export function renderChips(v: CardView): TemplateResult | typeof nothing {
  // Number entry takes the top-right corner.
  if ((v.ui !== 'playing' && !v.sleep) || v.numberEntry?.digits) return nothing;
  return html`<div class="chips-top ${v.chrome ? '' : 'hidden'}">
    ${
      v.sleep && !v.sleep.warning
        ? html`<span class="glass chip-top sleep-chip">
            ${icon('sleep')} Stops in <span class="mono">${minutesLeft(v.sleep.remainingMs)}</span>
          </span>`
        : nothing
    }
    ${
      v.ui === 'playing'
        ? html`<span class="glass chip-top live"
            ><span class="live-dot" role="img" aria-label="Live"></span>LIVE</span
          >`
        : nothing
    }
  </div>`;
}

/**
 * The broadcast-style channel number: on every change for a moment, and while digits are
 * being typed (with the channels they could still mean).
 */
export function renderOsd(v: CardView): TemplateResult | typeof nothing {
  const entry = v.numberEntry;
  if (entry?.digits) {
    const hint = entry.candidates
      .slice(0, 3)
      .map((c) => channelLabel(c))
      .join(' · ');
    return html`<div class="osd typing" role="status" aria-label="Channel ${entry.digits}">
      <span class="osd-number mono">${entry.digits}<span class="cursor">_</span></span>
      <span class="osd-hint">${hint || 'No channel with that number'}</span>
    </div>`;
  }
  const ch = v.channel;
  if (!v.osd || !ch?.number || v.ui === 'connecting' || v.ui === 'error') return nothing;
  return html`<div class="osd" aria-hidden="true">
    <span class="osd-number mono">${ch.number}</span>
    <span class="osd-text">
      <span class="osd-label">Now on</span>
      <span class="osd-name">${ch.name}</span>
    </span>
  </div>`;
}

function playButton(a: CardActions, text?: string): TemplateResult {
  return html`<div class="layer ${text ? 'dim' : ''}">
    <button class="big-play" @click=${a.play} aria-label="Play">${icon('play')}</button>
    ${text ? html`<div class="message">${text}</div>` : nothing}
  </div>`;
}

/** The middle of the picture for each state. */
export function renderCenter(v: CardView, a: CardActions): TemplateResult | typeof nothing {
  if (v.sleep?.warning && (v.ui === 'playing' || v.ui === 'reconnecting')) {
    return html`<div class="layer dim sleep-warning" role="alert">
      <span class="state-icon">${icon('sleep')}</span>
      <div class="message big">
        Stopping in <span class="mono">${countdown(v.sleep.remainingMs)}</span>
      </div>
      <div class="actions">
        ${
          a.setSleep
            ? html`<button class="pill light keep-watching" @click=${() => a.setSleep?.(0)}>
                Keep watching
              </button>`
            : nothing
        }
        ${
          a.extendSleep
            ? html`<button class="pill extend-sleep" @click=${() => a.extendSleep?.(30)}>
                +30 min
              </button>`
            : nothing
        }
      </div>
    </div>`;
  }
  switch (v.ui) {
    case 'preview': {
      const e = v.edit;
      return html`<div class="layer edit">
        <span class="state-icon muted">${icon('tv')}</span>
        <div class="message">Playback is off while editing</div>
        ${
          e
            ? html`<div class="edit-tags">
                <span class="tag mono">target: ${e.target}</span>
                ${e.profile ? html`<span class="tag mono">profile ${e.profile}</span>` : nothing}
                ${
                  e.favourites
                    ? html`<span class="tag mono"
                        >${e.favourites} favourite${e.favourites === 1 ? '' : 's'}</span
                      >`
                    : nothing
                }
              </div>`
            : nothing
        }
      </div>`;
    }
    case 'empty':
      return html`<div class="layer">
        <span class="state-icon muted">${icon('tv')}</span>
        <div class="message">${v.hasGuide ? 'Choose a channel below' : 'Choose a channel'}</div>
      </div>`;
    case 'error': {
      const back = a.lastChannel && v.previousChannel ? v.previousChannel : undefined;
      return html`<div class="layer solid" role="alert">
        <span class="state-icon warn">${icon('alert')}</span>
        <div class="message">${v.errorMessage}</div>
        ${v.errorDetail ? html`<div class="message detail">${v.errorDetail}</div>` : nothing}
        <div class="actions">
          ${
            back
              ? html`<button class="pill primary back-to" @click=${() => a.lastChannel?.()}>
                  Back to <span class="mono">${back.number ?? back.name}</span>
                </button>`
              : nothing
          }
          ${
            v.canRetry
              ? html`<button class="pill ${back ? '' : 'primary'} retry" @click=${a.play}>
                  ${icon('refresh')} Retry
                </button>`
              : nothing
          }
          ${
            v.hasGuide
              ? html`<button
                  class="pill channels"
                  @click=${a.toggleGuide}
                  aria-expanded=${v.guideOpen ? 'true' : 'false'}
                >
                  ${icon('guide')} Channels
                </button>`
              : nothing
          }
        </div>
      </div>`;
    }
    case 'connecting': {
      if (v.needsGesture) return playButton(a, 'Tap to play');
      const ch = v.channel;
      const name = v.title ?? ch?.name;
      return html`<div class="layer tuning">
        ${name ? logo(ch, name, 'tuning-logo') : nothing}
        ${
          name
            ? html`<div class="tuning-name">
                ${ch?.number ? html`<span class="mono">${ch.number}</span>` : nothing} ${name}
              </div>`
            : nothing
        }
        <div class="tuning-status">
          <span
            class="spinner small"
            role="progressbar"
            aria-label=${v.buffering ? 'Buffering' : 'Tuning'}
          ></span>
          <span class="message">${v.buffering ? 'Buffering…' : 'Tuning'}</span>
        </div>
      </div>`;
    }
    case 'reconnecting': {
      if (v.needsGesture) return playButton(a, 'Tap to play');
      const wait = v.retryAt ? Math.max(0, Math.ceil((v.retryAt - v.now) / 1000)) : 0;
      return html`<div class="layer dim">
        <span class="spinner" role="progressbar" aria-label="Reconnecting"></span>
        <div class="message big">Picture dropped. Reconnecting…</div>
        <div class="message sub mono">
          try ${v.failures} of ${v.maxAttempts}${wait > 0 ? ` · next in ${wait} s` : ''}
        </div>
      </div>`;
    }
    case 'playing':
      if (v.needsGesture) return playButton(a, 'Tap to play');
      if (v.mutedByPolicy)
        return html`<div class="layer">
          <button class="pill glass unmute" @click=${a.unmute} aria-label="Unmute">
            ${icon('volumeOff')} Tap for sound
          </button>
        </div>`;
      // buffer: stable refilling its reserve after running dry.
      if (v.buffering)
        return html`<div class="layer">
          <span class="spinner" role="progressbar" aria-label="Buffering"></span>
          <div class="message">Buffering…</div>
        </div>`;
      return nothing;
    case 'ready':
      return playButton(a, v.stoppedReason);
  }
}

function sleepMenu(v: CardView, a: CardActions): TemplateResult | typeof nothing {
  if (!v.sleepMenuOpen || !a.setSleep) return nothing;
  const current = v.sleep ? Math.ceil(v.sleep.remainingMs / 60000) : 0;
  return html`<div class="glass sleep-menu" role="group" aria-label="Stop playing after">
    <span class="menu-label">Stop playing after</span>
    <div class="sleep-options">
      ${SLEEP_OPTIONS.map((m) => {
        const on = m === 0 ? !v.sleep : SLEEP_OPTIONS.includes(current) && current === m;
        return html`<button
          class="sleep-option"
          aria-pressed=${on ? 'true' : 'false'}
          @click=${(e: Event) => {
            e.stopPropagation();
            a.setSleep?.(m);
            a.toggleSleepMenu();
          }}
        >
          ${m === 0 ? 'Off' : `${m}m`}
        </button>`;
      })}
    </div>
  </div>`;
}

/** The control bar: transport on the left, what's next in the middle, sound and view on the right. */
export function renderControls(v: CardView, a: CardActions): TemplateResult | typeof nothing {
  // The error layer has its own buttons; nothing to control in preview or empty states.
  if (v.ui === 'preview' || v.ui === 'empty' || v.ui === 'error' || v.layout === 'tv') {
    return nothing;
  }
  const active = v.ui === 'playing' || v.ui === 'connecting' || v.ui === 'reconnecting';
  const prev = v.previousChannel;
  const next = v.nowNext?.next;
  const vol = Math.round((v.muted ? 0 : (v.volume ?? 1)) * 100);
  return html`<div class="controls ${v.chrome ? '' : 'hidden'}" @click=${stop}>
    <div class="group transport">
      ${
        active
          ? html`<button class="ctl ctl-stop" @click=${a.stop} aria-label="Stop">
              ${icon('stop')}
            </button>`
          : nothing
      }
      ${
        a.lastChannel && prev
          ? html`<button
              class="ctl ctl-last"
              @click=${() => a.lastChannel?.()}
              aria-label="Last channel: ${channelLabel(prev)}"
              title="Last channel: ${channelLabel(prev)}"
            >
              ${icon('last')}
            </button>`
          : nothing
      }
      ${
        v.canStep
          ? html`<span class="sep" aria-hidden="true"></span>
              <button class="ctl ctl-down" @click=${a.channelDown} aria-label="Previous channel">
                ${icon('chevronDown')}
              </button>
              <button class="ctl ctl-up" @click=${a.channelUp} aria-label="Next channel">
                ${icon('chevronUp')}
              </button>`
          : nothing
      }
      <span class="row-break" aria-hidden="true"></span>
    </div>
    <div class="group upnext ${next ? '' : 'empty'}">
      ${
        next
          ? html`<span class="upnext-label">Next</span>
              ${next.start ? html`<span class="mono upnext-time">${clock(next.start)}</span>` : nothing}
              <span class="upnext-title">${next.title}</span>`
          : nothing
      }
    </div>
    <div class="group sound">
      <button class="ctl ctl-mute" @click=${a.toggleMute} aria-label=${v.muted ? 'Unmute' : 'Mute'}>
        ${icon(v.muted ? 'volumeOff' : vol < 50 ? 'volumeLow' : 'volumeHigh')}
      </button>
      ${
        a.setVolume
          ? html`<input
              class="vol-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              aria-label="Volume"
              .value=${String(vol)}
              style="--vol:${vol}%"
              @input=${(e: Event) => a.setVolume?.(Number((e.target as HTMLInputElement).value) / 100)}
            />`
          : nothing
      }
      <span class="sep" aria-hidden="true"></span>
      ${
        a.setSleep
          ? html`<button
              class="ctl ctl-sleep ${v.sleep || v.sleepMenuOpen ? 'on' : ''}"
              @click=${a.toggleSleepMenu}
              aria-label=${v.sleep ? `Sleep timer, ${minutesLeft(v.sleep.remainingMs)} left` : 'Sleep timer'}
              aria-expanded=${v.sleepMenuOpen ? 'true' : 'false'}
            >
              ${icon('sleep')}
            </button>`
          : nothing
      }
      ${
        v.hasGuide
          ? html`<button
              class="ctl ctl-channels ${v.guideOpen ? 'on' : ''}"
              @click=${a.toggleGuide}
              aria-label=${v.guideOpen ? 'Hide channels' : 'Channels'}
              aria-expanded=${v.guideOpen ? 'true' : 'false'}
            >
              ${icon('guide')}
            </button>`
          : nothing
      }
      ${
        a.multiview
          ? html`<button
              class="ctl ctl-multiview"
              @click=${() => a.multiview?.()}
              aria-label="Multiview"
            >
              ${icon('grid')}
            </button>`
          : nothing
      }
      <button
        class="ctl ctl-fullscreen"
        @click=${a.toggleFullscreen}
        aria-label=${v.fullscreen ? 'Exit full screen' : 'Full screen'}
      >
        ${icon(v.fullscreen ? 'fullscreenExit' : 'fullscreen')}
      </button>
      ${sleepMenu(v, a)}
    </div>
  </div>`;
}

/** Clicks on the bar's background mustn't count as a tap on the picture. */
function stop(e: Event): void {
  e.stopPropagation();
}

/** TV: remote-key hints and the clock along the bottom, shown with the ident. */
export function renderTvHints(v: CardView, keys: boolean): TemplateResult | typeof nothing {
  if (v.layout !== 'tv' || !v.chrome || v.ui === 'preview') return nothing;
  return html`<div class="tv-hints" aria-hidden="true">
    ${
      keys
        ? html`<span><span class="key">▲</span><span class="key">▼</span>Channel</span>
            <span><span class="key mono">0–9</span>Number</span>
            <span><span class="key">OK</span>Guide</span>
            <span><span class="key">BACK</span>Last channel</span>`
        : nothing
    }
    <span class="tv-clock mono">${clock(v.now)}</span>
  </div>`;
}
