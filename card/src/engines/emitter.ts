import type { EngineEvent } from './types';

export class Emitter {
  private listeners = new Set<(e: EngineEvent) => void>();

  on(listener: (e: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(e: EngineEvent): void {
    for (const l of [...this.listeners]) {
      try {
        l(e);
      } catch (err) {
        console.error('[stream-card] engine listener failed', err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
