// Adds the card resources and the "stream-test" dashboard over the websocket API.
import { readFileSync } from 'node:fs';

const tok = JSON.parse(readFileSync(process.env.HA_TOKENS ?? 'tokens.json', 'utf8'));
const FAKE = 'http://127.0.0.1:8930';
const ws = new WebSocket('ws://127.0.0.1:8123/api/websocket');
let id = 0;
const waiting = new Map();
const call = (msg) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    waiting.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, ...msg }));
  });

const play = (target, channel, title, open) => ({
  action: 'fire-dom-event',
  stream_card: { target, channel, ...(title ? { title } : {}), ...(open ? { open } : {}) },
});

// A sections view, as recommended for new dashboards. HA's sections view does not render
// view-level cards, so the Bubble pop-up gets its own section; Bubble hides it until the hash
// opens it. The "Other" view is used to test view switching.
const popupCard = {
  type: 'custom:stream-card',
  target: 'tv_test',
  dispatcharr_url: FAKE,
  output_profile: 2,
  debug: true,
};

export const DASHBOARD = {
  views: [
    {
      title: 'Main',
      path: 'main',
      type: 'sections',
      max_columns: 3,
      sections: [
        {
          type: 'grid',
          cards: [
            { type: 'heading', heading: 'Buttons' },
            {
              type: 'button',
              name: 'HA button: play A in pop-up',
              icon: 'mdi:television',
              show_state: false,
              tap_action: play('tv_test', 'ok--ha-a', 'Channel A', '#tv-test'),
            },
            {
              // Bubble buttons: tap_action is the icon, button_action the body.
              type: 'custom:bubble-card',
              card_type: 'button',
              button_type: 'name',
              name: 'Bubble button: play B in pop-up',
              icon: 'mdi:television-play',
              card_layout: 'large',
              tap_action: play('tv_test', 'ok--ha-b', 'Channel B', '#tv-test'),
              button_action: { tap_action: play('tv_test', 'ok--ha-b', 'Channel B', '#tv-test') },
            },
            {
              // Channel by name, looked up in the pop-up card's channel list.
              type: 'custom:bubble-card',
              card_type: 'button',
              button_type: 'name',
              name: 'Bubble button: Sports Live HD by name',
              icon: 'mdi:soccer',
              tap_action: play('tv_test', 'Sports Live HD', undefined, '#tv-test'),
              button_action: {
                tap_action: play('tv_test', 'Sports Live HD', undefined, '#tv-test'),
              },
            },
            {
              type: 'button',
              name: 'Stop pop-up',
              icon: 'mdi:stop',
              show_state: false,
              tap_action: {
                action: 'fire-dom-event',
                stream_card: { target: 'tv_test', action: 'stop' },
              },
            },
            {
              type: 'button',
              name: 'Play C on page card',
              icon: 'mdi:play',
              show_state: false,
              tap_action: play('page', 'ok--ha-c', 'Channel C'),
            },
          ],
        },
        {
          type: 'grid',
          column_span: 2,
          cards: [
            {
              type: 'custom:stream-card',
              target: 'page',
              dispatcharr_url: FAKE,
              output_profile: 2,
              debug: true,
            },
          ],
        },
        {
          type: 'grid',
          cards: [
            {
              type: 'custom:bubble-card',
              card_type: 'pop-up',
              hash: '#tv-test',
              name: 'TV',
              icon: 'mdi:television',
              width_desktop: '900px',
              cards: [popupCard],
            },
          ],
        },
      ],
    },
    {
      title: 'Other',
      path: 'other',
      type: 'sections',
      sections: [{ type: 'grid', cards: [{ type: 'markdown', content: 'Another view' }] }],
    },
  ],
};

async function main() {
  const resources = await call({ type: 'lovelace/resources' });
  for (const url of [
    '/local/bubble-card/bubble-card.js',
    '/local/stream-card/stream-card.js?v=test',
  ]) {
    if (!resources.some((r) => r.url === url)) {
      await call({ type: 'lovelace/resources/create', res_type: 'module', url });
    }
  }
  const dashboards = await call({ type: 'lovelace/dashboards/list' });
  if (!dashboards.some((d) => d.url_path === 'stream-test')) {
    await call({
      type: 'lovelace/dashboards/create',
      url_path: 'stream-test',
      title: 'Stream Test',
      mode: 'storage',
      show_in_sidebar: true,
      require_admin: false,
    });
  }
  await call({ type: 'lovelace/config/save', url_path: 'stream-test', config: DASHBOARD });
  console.log('Test dashboard ready');
  ws.close();
}

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.type === 'auth_required')
    ws.send(JSON.stringify({ type: 'auth', access_token: tok.access_token }));
  else if (m.type === 'auth_ok')
    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  else if (m.type === 'auth_invalid') {
    console.error('auth invalid');
    process.exit(1);
  } else if (m.id && waiting.has(m.id)) {
    const w = waiting.get(m.id);
    waiting.delete(m.id);
    if (m.success) w.resolve(m.result);
    else w.reject(new Error(JSON.stringify(m.error)));
  }
};
