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
  reconnect?: { max_attempts?: number; keep_trying?: boolean };
  /** Watch for a frozen or black picture and recover (default on). */
  picture_check?: boolean;
  /** HA action that moves the channel to its next source in Dispatcharr, e.g. rest_command.dispatcharr_next_stream. */
  switch_source?: string;
  debug?: boolean;
  channel_list?: boolean;
  m3u_url?: string;
  channel_groups?: string[];
  favourites?: Array<string | number>;
  remember_channel?: boolean;
  buffer?: BufferMode;
  epg?: boolean;
  epg_url?: string;
  guide?: GuideMode;
  /** The settings button in the control bar (default on). */
  settings?: boolean;
  multiview?: boolean | MultiviewConfig;
  /**
   * Lower qualities, each a Dispatcharr output profile, e.g. 2160p down to 360p. "Source" (the
   * stream as Dispatcharr sends it, no profile) is always at the top. Setting this turns on the
   * Quality menu and Auto quality; `output_profile` then only fixes formats a device can't play.
   */
  qualities?: QualityConfig[];
}

export interface QualityConfig {
  /** Shown in the settings panel, e.g. "720p". The height is read from it unless `height` is set. */
  name: string;
  output_profile: number | string;
  /** Picture height this profile outputs, e.g. 720. */
  height?: number;
}

/** One rung of the quality ladder. Rung 0 is always "Source". */
export interface QualityRung {
  name: string;
  outputProfile?: string;
  /** Output height; rungs at or above a channel's own height aren't offered. Unset on Source. */
  height?: number;
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

/**
 * `auto` (default): a reserve that grows when the picture runs dry and shrinks when it's smooth.
 * `low`: stay close to live. `stable`: keep a fixed reserve of several seconds for slow devices.
 */
export type BufferMode = 'auto' | 'low' | 'stable';

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
  /** After the normal attempts, keep retrying every minute instead of stopping on an error. */
  keepTrying: boolean;
  pictureCheck: boolean;
  /** `domain.service` called with `{ channel: <uuid> }` to switch source; unset = never switch. */
  switchSource?: string;
  debug: boolean;
  /** Load Dispatcharr's channel list (M3U) for the picker, channel up/down and name lookups. */
  channelList: boolean;
  m3uUrl?: string;
  channelGroups: string[];
  favourites: string[];
  rememberChannel: boolean;
  buffer: BufferMode;
  /** Show now/next programme info from Dispatcharr's XMLTV guide (default on with a list and guide URL). */
  epg: boolean;
  epgUrl?: string;
  guide: GuideMode;
  /** Show the settings button, whose choices override this config per device. */
  settings: boolean;
  multiview: ResolvedMultiview;
  /**
   * Source first, then the `qualities` list (best first). Without `qualities`, just Source with
   * the card's `output_profile`, as before there were qualities.
   */
  qualities: QualityRung[];
  /** With `qualities`: the profile Source falls back to when this device can't play its audio. */
  formatProfile?: string;
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
