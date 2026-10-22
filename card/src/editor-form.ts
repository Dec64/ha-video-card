/**
 * Schema for Home Assistant's built-in card editor form (`getConfigForm`). Every field maps
 * 1:1 to a YAML option; anything the form can't show still works in the YAML editor.
 */

interface FormField {
  name: string;
  type?: 'expandable' | 'grid';
  title?: string;
  flatten?: boolean;
  required?: boolean;
  /** Shown when the option isn't set: a switch shows on/off, text fields a placeholder. */
  default?: unknown;
  selector?: Record<string, unknown>;
  schema?: FormField[];
}

const text = { text: {} };
const bool = { boolean: {} };
const on = { selector: bool, default: true };
const box = (min: number, max: number, unit?: string) => ({
  number: { min, max, mode: 'box', ...(unit ? { unit_of_measurement: unit } : {}) },
});

const schema: FormField[] = [
  { name: 'dispatcharr_url', required: true, selector: { text: { type: 'url' } } },
  {
    name: '',
    type: 'grid',
    flatten: true,
    schema: [
      { name: 'output_profile', selector: box(0, 9999) },
      { name: 'target', selector: text },
    ],
  },
  {
    name: '',
    type: 'expandable',
    flatten: true,
    title: 'Channels',
    schema: [
      { name: 'channel_list', ...on },
      { name: 'channel_groups', selector: { text: { multiple: true } } },
      { name: 'favourites', selector: { text: { multiple: true } } },
      { name: 'channel', selector: text },
      { name: 'remember_channel', ...on },
      { name: 'epg', ...on },
    ],
  },
  {
    name: '',
    type: 'expandable',
    flatten: true,
    title: 'Playback',
    schema: [
      {
        name: '',
        type: 'grid',
        flatten: true,
        schema: [
          { name: 'autoplay', ...on },
          { name: 'muted', selector: bool },
        ],
      },
      {
        name: 'aspect_ratio',
        default: '16:9',
        selector: {
          select: { mode: 'dropdown', custom_value: true, options: ['16:9', '4:3', '21:9', '1:1'] },
        },
      },
      {
        name: '',
        type: 'grid',
        flatten: true,
        schema: [
          { name: 'idle_timeout', default: 0, selector: box(0, 1440, 'min') },
          { name: 'start_timeout', default: 20, selector: box(1, 300, 's') },
        ],
      },
      {
        name: 'reconnect',
        type: 'grid',
        schema: [{ name: 'max_attempts', default: 5, selector: box(0, 50) }],
      },
      { name: 'debug', selector: bool },
    ],
  },
  {
    name: '',
    type: 'expandable',
    flatten: true,
    title: 'Advanced',
    schema: [
      { name: 'url', selector: text },
      { name: 'title', selector: text },
      { name: 'm3u_url', selector: { text: { type: 'url' } } },
      { name: 'epg_url', selector: { text: { type: 'url' } } },
      { name: 'url_template', default: '{base}/proxy/ts/stream/{channel}', selector: text },
    ],
  },
];

const LABELS: Record<string, string> = {
  dispatcharr_url: 'Dispatcharr URL',
  output_profile: 'Output profile ID',
  target: 'Target name',
  channel_list: 'Channel list',
  channel_groups: 'Group',
  favourites: 'Favourite',
  channel: 'Default channel',
  remember_channel: 'Remember last channel',
  autoplay: 'Autoplay',
  muted: 'Start muted',
  aspect_ratio: 'Aspect ratio',
  idle_timeout: 'Stop after idle',
  start_timeout: 'Start timeout',
  max_attempts: 'Reconnect attempts',
  debug: 'Debug overlay',
  url: 'Stream URL instead of a channel',
  title: 'Title for the default channel',
  m3u_url: 'Channel list (M3U) URL',
  epg: 'Now and next',
  epg_url: 'Guide (XMLTV) URL',
  url_template: 'Channel URL template',
};

const HELPERS: Record<string, string> = {
  dispatcharr_url: 'e.g. https://dispatcharr.example',
  output_profile:
    'The AAC output profile from the README. Leave empty to play streams as they are.',
  target: 'Buttons with the same target play on this card.',
  channel_list: 'Load every Dispatcharr channel for the picker and channel up/down.',
  channel_groups: 'Only show these Dispatcharr groups, in this order. None = every group.',
  favourites: 'Channel names or numbers, shown first under ★ Favourites.',
  channel: 'Name, number or UUID to play when the card appears.',
  remember_channel: 'Start on the channel this device watched last.',
  idle_timeout: '0 = never.',
  start_timeout: 'Seconds to wait for the first data.',
  m3u_url: 'Default: <Dispatcharr URL>/output/m3u',
  epg: "Show what's on now and next from Dispatcharr's guide. Downloads the next 24 hours of the guide every 2 hours while a dashboard with the card is open.",
  epg_url: 'Default: <Dispatcharr URL>/output/epg?days=1',
  url_template: 'Default: {base}/proxy/ts/stream/{channel}',
};

export const configForm = {
  schema,
  computeLabel: (field: { name: string }) => LABELS[field.name],
  computeHelper: (field: { name: string }) => HELPERS[field.name],
};
