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
  epg?: boolean;
  epg_url?: string;
  guide?: GuideMode;
  multiview?: boolean | MultiviewConfig;
}

/** The card's `multiview:` block. `multiview: true` is short for `{ enabled: true }`. */
export interface MultiviewConfig {
  enabled?: boolean;
  /** Most tiles at once, 2–4. Each tile is its own Dispatcharr connection. */
  max_tiles?: number;
  /** Output profile for tiles (e.g. a lower resolution); default the card's `output_profile`. */
  output_profile?: number | string;
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
  /** Show now/next programme info from Dispatcharr's XMLTV guide (default on with a list and guide URL). */
  epg: boolean;
  epgUrl?: string;
  guide: GuideMode;
  multiview: ResolvedMultiview;
}

export interface ResolvedMultiview {
  enabled: boolean;
  maxTiles: number;
  /** The output profile tiles use (the card's own unless `multiview.output_profile` is set). */
  outputProfile?: string;
}

export type StreamAction =
  | 'play'
  | 'stop'
  | 'channel_up'
  | 'channel_down'
  | 'last_channel'
  | 'sleep'
  | 'volume'
  | 'mute'
  | 'unmute';

/** Actions that steer whatever the target is playing rather than choosing a channel. */
export type NavAction = Exclude<StreamAction, 'play' | 'stop'>;

/** A request from a button's `stream_card:` block, the card's own config, or the card itself. */
export interface StreamRequest {
  target?: string;
  action?: StreamAction;
  channel?: string;
  url?: string;
  type?: SourceType;
  title?: string;
  open?: string;
  /** `action: sleep`: minutes until the target stops; 0 cancels. */
  sleep?: number;
  /** `action: volume`: 0–100. */
  volume?: number;
}

/** Something the card can hand to an engine. */
export interface StreamSource {
  url: string;
  type: SourceType;
  title?: string;
  channel?: string;
}
