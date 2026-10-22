/** Card YAML, as written by the user. */
export interface StreamCardConfig {
  type: string;
  target?: string;
  dispatcharr_url?: string;
  output_profile?: number | string;
  url_template?: string;
  channel?: string;
  url?: string;
  title?: string;
  autoplay?: boolean;
  muted?: boolean;
  aspect_ratio?: string;
  idle_timeout?: number;
  start_timeout?: number;
  reconnect?: { max_attempts?: number };
  debug?: boolean;
  channel_list?: boolean;
  m3u_url?: string;
  channel_groups?: string[];
  favourites?: Array<string | number>;
  remember_channel?: boolean;
  guide?: GuideMode;
}

/** The channel guide under the picture: shown, collapsed until Channels is pressed, or never. */
export type GuideMode = 'open' | 'closed' | 'off';

export type SourceType = 'mpegts' | 'native';

/** Card config after validation and defaults. */
export interface ResolvedConfig {
  target: string;
  dispatcharrUrl?: string;
  outputProfile?: string;
  urlTemplate: string;
  defaultRequest?: StreamRequest;
  autoplay: boolean;
  muted: boolean;
  aspectRatio: string;
  idleTimeoutMs: number;
  startTimeoutMs: number;
  maxReconnectAttempts: number;
  debug: boolean;
  /** Load Dispatcharr's channel list (M3U) for the picker, channel up/down and name lookups. */
  channelList: boolean;
  m3uUrl?: string;
  channelGroups: string[];
  favourites: string[];
  rememberChannel: boolean;
  guide: GuideMode;
}

/** A play/stop request, from a button's `stream_card:` block or the card's own config. */
export interface StreamRequest {
  target?: string;
  action?: 'play' | 'stop';
  channel?: string;
  url?: string;
  type?: SourceType;
  title?: string;
  open?: string;
}

/** Something the card can hand to an engine. */
export interface StreamSource {
  url: string;
  type: SourceType;
  title?: string;
  channel?: string;
}
