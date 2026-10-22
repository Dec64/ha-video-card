import { css } from 'lit';

/**
 * Design tokens, mapped from the HA theme so the card sits in any dashboard, light or dark.
 * The picture area is always dark whatever the theme. Users can override any `--stream-card-*`
 * variable with card-mod or a theme.
 */
export const tokens = css`
  :host {
    --sc-font: var(
      --stream-card-font,
      var(
        --ha-font-family-body,
        var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif)
      )
    );
    --sc-mono: var(
      --stream-card-mono-font,
      ui-monospace,
      'SF Mono',
      'Roboto Mono',
      Menlo,
      Consolas,
      monospace
    );
    --sc-card: var(--ha-card-background, var(--card-background-color, #1b1d23));
    --sc-text: var(--primary-text-color, #eceef2);
    --sc-text-2: var(--secondary-text-color, #b2b7c1);
    --sc-accent: var(--stream-card-accent, var(--primary-color, #41b4f6));
    --sc-on-accent: var(--stream-card-on-accent, var(--text-primary-color, #fff));
    --sc-line: var(--divider-color, rgba(127, 127, 127, 0.2));
    --sc-surface: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    --sc-surface-2: rgba(127, 127, 127, 0.2);
    /* Selected chips: a tint of the accent with the theme's text on it, readable in any theme. */
    --sc-accent-soft: rgba(127, 127, 127, 0.2);
    --sc-radius: var(--ha-card-border-radius, 12px);
    --sc-warn: var(--error-color, #ff8a80);
    --sc-fav: #f5b83d;
    --sc-logo-bg: var(--stream-card-logo-background, #1c1c1c);
    /* The picture area: always dark. */
    --sc-pic: #07080a;
    --sc-pic-text: #f4f5f7;
    --sc-pic-text-2: rgba(255, 255, 255, 0.75);
    --sc-glass: rgba(14, 15, 18, 0.55);
    --sc-glass-line: rgba(255, 255, 255, 0.1);
    --sc-glass-hover: rgba(255, 255, 255, 0.12);
    --sc-live: #ff5b4f;
    --sc-ease: cubic-bezier(0.16, 1, 0.3, 1);
    /* Touch targets: 44 px, 56 px on wall panels. */
    --sc-target: 44px;
  }
  @supports (color: color-mix(in srgb, red, blue)) {
    :host {
      --sc-surface: color-mix(in srgb, var(--sc-text) 7%, var(--sc-card));
      --sc-surface-2: color-mix(in srgb, var(--sc-text) 13%, var(--sc-card));
      --sc-accent-soft: color-mix(in srgb, var(--sc-accent) 24%, var(--sc-card));
    }
  }
  @media (pointer: coarse) and (min-width: 900px) {
    :host {
      --sc-target: 56px;
    }
  }
`;
