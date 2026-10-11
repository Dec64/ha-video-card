import { CARD_NAME, CARD_TAG, VERSION } from './const';
import { getController } from './controller';
import { PICKER_TAG, StreamCardPicker } from './picker';
import { sessionCounters } from './session';
import { StreamCard } from './stream-card';

const controller = getController();
(controller as unknown as { counters: typeof sessionCounters }).counters ??= sessionCounters;

if (!customElements.get(PICKER_TAG)) customElements.define(PICKER_TAG, StreamCardPicker);
if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, StreamCard);

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}
const w = window as unknown as { customCards?: CustomCardEntry[] };
w.customCards = w.customCards ?? [];
if (!w.customCards.some((c) => c.type === CARD_TAG)) {
  w.customCards.push({
    type: CARD_TAG,
    name: CARD_NAME,
    description: 'Plays Dispatcharr IPTV channels and releases the stream when it is hidden.',
    preview: false,
    documentationURL: 'https://github.com/Dec64/ha-video-card',
  });
}

console.info(
  `%c STREAM-CARD %c ${VERSION} `,
  'color:#fff;background:#1565c0;font-weight:700',
  'color:#1565c0;background:#fff',
);
