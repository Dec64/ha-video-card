import type { Channel, ChannelList } from '../channels';
import type { GuideFeed } from '../epg';
import type { ResolvedConfig } from '../types';
import type { AppHost } from './app';

/**
 * The parts of the card the app reads. They are private to the card's own type, but this chunk
 * is part of the card: building the host here keeps the bridge out of the card's initial load.
 */
interface CardInternals extends HTMLElement {
  config: ResolvedConfig;
  channels?: ChannelList;
  guide?: GuideFeed;
  currentChannel?: Channel;
  video: HTMLVideoElement;
  mv?: HTMLElement;
  mvOn: boolean;
  playChannel(ch: Channel): void;
  refresh(): void;
  onFrameClick(): void;
  showControls(): void;
  deleteDigit(): void;
  onKeyDown(e: KeyboardEvent): void;
}

export function hostFor(el: HTMLElement): AppHost {
  const card = el as CardInternals;
  return {
    el,
    video: card.video,
    get config() {
      return card.config;
    },
    get list() {
      return card.channels;
    },
    get guide() {
      return card.guide;
    },
    get current() {
      return card.currentChannel;
    },
    get multiview() {
      return card.mvOn ? card.mv : undefined;
    },
    play: (ch) => card.playChannel(ch),
    refresh: () => card.refresh(),
    frameClick: () => card.onFrameClick(),
    wake: () => card.showControls(),
    deleteDigit: () => card.deleteDigit(),
    handleKey: (e) => card.onKeyDown(e),
  };
}
