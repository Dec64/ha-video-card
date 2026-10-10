import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
  }
  ha-card {
    display: block;
    overflow: hidden;
    height: 100%;
  }
  .frame {
    position: relative;
    width: 100%;
    background: #000;
    color: #fff;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, sans-serif));
  }
  .frame:fullscreen {
    aspect-ratio: auto !important;
    width: 100%;
    height: 100%;
  }
  .video-host,
  .video-host video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .video-host video {
    object-fit: contain;
    background: #000;
  }
  .layer {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    box-sizing: border-box;
    text-align: center;
    pointer-events: none;
  }
  .layer > * {
    pointer-events: auto;
  }
  .layer.dim {
    background: rgba(0, 0, 0, 0.55);
  }
  .message {
    max-width: 36em;
    font-size: 14px;
    line-height: 1.4;
    color: #f2f2f2;
  }
  .message.detail {
    font-size: 12px;
    opacity: 0.75;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    word-break: break-word;
  }
  .error-icon svg {
    width: 40px;
    height: 40px;
    fill: var(--error-color, #ef5350);
  }
  .placeholder-icon svg {
    width: 48px;
    height: 48px;
    fill: rgba(255, 255, 255, 0.6);
  }
  button {
    font: inherit;
    color: inherit;
    border: none;
    cursor: pointer;
    background: none;
    padding: 0;
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }
  .big-play {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    border: 2px solid rgba(255, 255, 255, 0.85);
    display: grid;
    place-items: center;
  }
  .big-play svg {
    width: 40px;
    height: 40px;
    fill: #fff;
    margin-left: 4px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.35);
    font-size: 14px;
  }
  .pill svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .pill.primary {
    background: var(--primary-color, #03a9f4);
    border-color: transparent;
    color: var(--text-primary-color, #fff);
  }
  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .badge {
    position: absolute;
    top: 10px;
    left: 10px;
    max-width: calc(100% - 20px);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.6);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.3s;
  }
  .live-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e53935;
  }
  .unmute {
    position: absolute;
    left: 10px;
    bottom: 10px;
  }
  .notice {
    position: absolute;
    left: 10px;
    right: 10px;
    top: 44px;
    font-size: 13px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.65);
    pointer-events: none;
  }
  .controls {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 6px;
    transition: opacity 0.3s;
  }
  .controls button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    display: grid;
    place-items: center;
  }
  .controls svg {
    width: 24px;
    height: 24px;
    fill: #fff;
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }
  .debug {
    position: absolute;
    top: 8px;
    right: 8px;
    max-width: 60%;
    padding: 6px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #b9f6ca;
    font:
      11px/1.35 ui-monospace,
      Menlo,
      Consolas,
      monospace;
    white-space: pre-wrap;
    word-break: break-all;
    pointer-events: none;
    text-align: left;
  }
`;
