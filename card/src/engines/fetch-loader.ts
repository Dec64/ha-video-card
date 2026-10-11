import type mpegts from 'mpegts.js';
import type { Mpegts } from './load-mpegts';

// mpegts.js LoaderStatus / LoaderErrors values (not exported as types).
const Status = { idle: 0, connecting: 1, buffering: 2, error: 3, complete: 4 } as const;
const Errors = {
  exception: 'Exception',
  httpStatus: 'HttpStatusCodeInvalid',
  earlyEof: 'EarlyEof',
} as const;

interface BaseLoaderShape {
  _status: number;
  _needStash: boolean;
  readonly onContentLengthKnown: ((n: number) => void) | null;
  readonly onURLRedirect: ((url: string) => void) | null;
  readonly onDataArrival:
    ((chunk: ArrayBuffer, byteStart: number, received: number) => void) | null;
  readonly onError: ((type: string, info: { code: number; msg: string }) => void) | null;
  readonly onComplete: ((from: number, to: number) => void) | null;
  isWorking(): boolean;
  destroy(): void;
}

type LoaderClass = new (seekHandler: mpegts.SeekHandler, config: mpegts.Config) => unknown;
const cache = new WeakMap<Mpegts, LoaderClass>();

/**
 * Replacement for mpegts.js's FetchStreamLoader. On Chrome-based browsers (Fire tablets, Android,
 * desktop Chrome) the stock loader's abort() only sets a flag while data is flowing and cancels
 * on the next chunk. If Dispatcharr stalls, that chunk never comes and the connection stays open.
 * This loader cancels the reader and aborts the request immediately.
 */
export function immediateAbortLoader(lib: Mpegts): LoaderClass {
  let cls = cache.get(lib);
  if (!cls) {
    cls = defineLoader(lib.BaseLoader as unknown as new (type: string) => BaseLoaderShape);
    cache.set(lib, cls);
  }
  return cls;
}

function defineLoader(Base: new (type: string) => BaseLoaderShape): LoaderClass {
  return class ImmediateAbortLoader extends Base {
    private ctrl?: AbortController;
    private reader?: ReadableStreamDefaultReader<Uint8Array>;
    private aborted = false;
    private received = 0;
    private contentLength: number | null = null;

    constructor(
      private readonly seekHandler: mpegts.SeekHandler,
      private readonly config: mpegts.Config,
    ) {
      super('immediate-abort-fetch-loader');
      this._needStash = true;
      // Lets the engine abort this loader directly (see MpegtsEngine.destroy).
      (config as { onLoaderCreated?: (l: { abort(): void }) => void }).onLoaderCreated?.(this);
    }

    override destroy(): void {
      if (this.isWorking()) this.abort();
      super.destroy();
    }

    open(dataSource: mpegts.MediaSegment & mpegts.MediaDataSource, range: mpegts.Range): void {
      const seek = this.seekHandler.getConfig(dataSource.url, range);
      const headers = new Headers();
      const add = (h: unknown) => {
        if (h && typeof h === 'object') {
          for (const [k, v] of Object.entries(h as Record<string, string>)) headers.append(k, v);
        }
      };
      add(seek.headers);
      add(this.config.headers);
      this.ctrl = new AbortController();
      this._status = Status.connecting;
      const init: RequestInit = {
        method: 'GET',
        headers,
        mode: dataSource.cors === false ? 'same-origin' : 'cors',
        cache: 'default',
        credentials: dataSource.withCredentials ? 'include' : 'same-origin',
        referrerPolicy: this.config.referrerPolicy ?? 'no-referrer-when-downgrade',
        signal: this.ctrl.signal,
      };
      fetch(seek.url, init)
        .then((res) => {
          if (this.aborted) {
            res.body?.cancel().catch(() => undefined);
            return;
          }
          if (!res.ok) {
            this._status = Status.error;
            this.onError?.(Errors.httpStatus, { code: res.status, msg: res.statusText });
            return;
          }
          if (res.redirected && res.url !== seek.url) {
            this.onURLRedirect?.(this.seekHandler.removeURLParameters(res.url));
          }
          const len = res.headers.get('Content-Length');
          if (len !== null) {
            this.contentLength = parseInt(len, 10);
            if (this.contentLength) this.onContentLengthKnown?.(this.contentLength);
          }
          if (!res.body) {
            this._status = Status.error;
            this.onError?.(Errors.exception, { code: -1, msg: 'Response has no body' });
            return;
          }
          this._status = Status.buffering;
          this.reader = res.body.getReader();
          return this.pump(this.reader, range.from);
        })
        .catch((e: unknown) => this.fail(e));
    }

    private async pump(
      reader: ReadableStreamDefaultReader<Uint8Array>,
      from: number,
    ): Promise<void> {
      for (;;) {
        const { done, value } = await reader.read();
        if (this.aborted) return;
        if (done) {
          if (this.contentLength !== null && this.received < this.contentLength) {
            this._status = Status.error;
            this.onError?.(Errors.earlyEof, { code: -1, msg: 'Fetch stream ended early' });
          } else {
            this._status = Status.complete;
            this.onComplete?.(from, from + this.received - 1);
          }
          return;
        }
        const chunk =
          value.byteOffset === 0 && value.byteLength === value.buffer.byteLength
            ? (value.buffer as ArrayBuffer)
            : (value.buffer.slice(
                value.byteOffset,
                value.byteOffset + value.byteLength,
              ) as ArrayBuffer);
        const byteStart = from + this.received;
        this.received += chunk.byteLength;
        this.onDataArrival?.(chunk, byteStart, this.received);
      }
    }

    private fail(e: unknown): void {
      if (this.aborted) {
        this._status = Status.complete;
        return;
      }
      this._status = Status.error;
      const msg = e instanceof Error ? e.message : String(e);
      // A connection lost mid-stream is an early EOF; failing before any data is an exception
      // (unreachable host or CORS), which the session diagnoses.
      const type = this.received > 0 ? Errors.earlyEof : Errors.exception;
      this.onError?.(type, { code: -1, msg });
    }

    abort(): void {
      if (this.aborted) return;
      this.aborted = true;
      try {
        void this.reader?.cancel().catch(() => undefined);
      } catch {
        /* already closed */
      }
      try {
        this.ctrl?.abort();
      } catch {
        /* ignore */
      }
      if (this._status === Status.connecting || this._status === Status.buffering) {
        this._status = Status.complete;
      }
    }
  };
}
