import { abortUpload, completeUpload, fetchPartBatch, fetchPartUrl } from './api';
import { md5 } from './md5';
import type { PartRecord, UploadSession } from './types';

export interface EngineCallbacks {
  onUpdate: (session: UploadSession) => void;
  onComplete: (session: UploadSession) => void;
}

const MAX_CONCURRENT_PARTS = 3;
const MAX_PART_ATTEMPTS = 3;
const URL_TTL_MS = 9 * 60 * 1000;

/**
 * Drives one multipart upload. Only parts that are not `done` are ever
 * uploaded, so a failed or interrupted run resumes from where it stopped.
 * Each state change is pushed through onUpdate so the caller can persist the
 * session (surviving tab closes) and re-render.
 */
export class UploadEngine {
  readonly session: UploadSession;
  private readonly file: File;
  private readonly callbacks: EngineCallbacks;

  private running = false;
  private paused = false;
  private stopped = false;
  private readonly inFlight = new Set<AbortController>();
  private resumeWaiter: (() => void) | null = null;
  private urls = new Map<number, string>();
  private urlsFetchedAt = 0;

  constructor(session: UploadSession, file: File, callbacks: EngineCallbacks) {
    this.session = session;
    this.file = file;
    this.callbacks = callbacks;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private emit(): void {
    this.callbacks.onUpdate({
      ...this.session,
      parts: [...this.session.parts],
    });
  }

  async start(): Promise<void> {
    if (this.running || this.stopped) return;
    if (this.session.status === 'completed' || this.session.status === 'aborted') {
      return;
    }

    this.running = true;
    this.paused = false;
    this.emit();

    try {
      await Promise.all(
        Array.from({ length: MAX_CONCURRENT_PARTS }, () => this.work()),
      );

      if (!this.stopped && this.allPartsDone()) {
        await this.complete();
      }
    } finally {
      this.running = false;
      this.emit();
    }
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.abortInFlight();
    this.emit();
  }

  resume(): void {
    if (this.paused) {
      this.paused = false;
      this.resumeWaiter?.();
      this.resumeWaiter = null;
    }
    void this.start();
  }

  retryFailed(): void {
    let changed = false;
    for (const part of this.session.parts) {
      if (part.status === 'failed') {
        part.status = 'pending';
        part.attempts = 0;
        part.error = undefined;
        changed = true;
      }
    }
    if (changed) {
      this.emit();
      void this.start();
    }
  }

  async abort(): Promise<void> {
    this.stopped = true;
    this.abortInFlight();
    this.paused = false;
    this.resumeWaiter?.();
    this.resumeWaiter = null;
    try {
      await abortUpload(this.session.documentId);
    } catch {
      // best effort; the reconciler job will clean up S3 if this fails
    }
    this.session.status = 'aborted';
    this.emit();
  }

  private work(): Promise<void> {
    const run = async () => {
      while (true) {
        if (this.stopped) return;
        if (this.paused) {
          await this.waitForResume();
          continue;
        }

        const part = this.nextPendingPart();
        if (!part) return;

        part.status = 'uploading';
        this.emit();

        const signal = new AbortController();
        this.inFlight.add(signal);
        try {
          const url = await this.ensureUrl(part.partNumber);
          if (this.stopped || this.paused) {
            part.status = 'pending';
            continue;
          }
          await this.putPart(part, url, signal.signal);
        } catch (err) {
          if (this.stopped || this.paused) {
            part.status = 'pending';
            continue;
          }
          part.attempts += 1;
          part.status = part.attempts >= MAX_PART_ATTEMPTS ? 'failed' : 'pending';
          part.error = err instanceof Error ? err.message : String(err);
          this.emit();
        } finally {
          this.inFlight.delete(signal);
        }
      }
    };
    return run();
  }

  private async waitForResume(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.resumeWaiter = resolve;
    });
  }

  private nextPendingPart(): PartRecord | null {
    for (const part of this.session.parts) {
      if (part.status === 'pending') return part;
      if (part.status === 'failed' && part.attempts < MAX_PART_ATTEMPTS) {
        return part;
      }
    }
    return null;
  }

  private async ensureUrl(partNumber: number): Promise<string> {
    const fresh =
      this.urlsFetchedAt > 0 && Date.now() - this.urlsFetchedAt < URL_TTL_MS;
    if (fresh) {
      const cached = this.urls.get(partNumber);
      if (cached) return cached;
    }

    this.urlsFetchedAt = Date.now();
    this.urls.clear();
    const batch = await fetchPartBatch(this.session.documentId);
    this.session.partSize = batch.partSize;
    for (const part of batch.parts) {
      this.urls.set(part.partNumber, part.url);
    }
    const url = this.urls.get(partNumber);
    if (!url) {
      return fetchPartUrl(this.session.documentId, partNumber);
    }
    return url;
  }

  private async putPart(
    part: PartRecord,
    url: string,
    signal: AbortSignal,
  ): Promise<void> {
    const start = (part.partNumber - 1) * this.session.partSize;
    const end = Math.min(part.partNumber * this.session.partSize, this.session.fileSize);
    const blob = this.file.slice(start, end);

    const res = await fetch(url, { method: 'PUT', body: blob, signal });
    if (!res.ok) {
      throw new Error(`PUT part ${part.partNumber} failed (${res.status})`);
    }

    const etag = res.headers.get('etag');
    if (etag) {
      part.etag = etag;
    } else {
      part.etag = `"${md5(new Uint8Array(await blob.arrayBuffer()))}"`;
    }
    part.status = 'done';
    this.emit();
  }

  private allPartsDone(): boolean {
    return this.session.parts.every((p) => p.status === 'done');
  }

  private async complete(): Promise<void> {
    const parts = this.session.parts
      .filter((p) => p.status === 'done' && p.etag)
      .map((p) => ({ partNumber: p.partNumber, etag: p.etag as string }));

    if (parts.length !== this.session.totalParts) return;

    const data = await completeUpload(this.session.documentId, parts);
    this.session.status = 'completed';
    this.session.result = {
      key: data.key,
      location: data.location,
      etag: data.etag,
    };
    this.callbacks.onComplete({
      ...this.session,
      parts: [...this.session.parts],
    });
  }

  private abortInFlight(): void {
    for (const signal of this.inFlight) signal.abort();
    this.inFlight.clear();
    for (const part of this.session.parts) {
      if (part.status === 'uploading') part.status = 'pending';
    }
  }
}

export function bytesUploaded(session: UploadSession): number {
  const done = session.parts.filter((p) => p.status === 'done').length;
  return Math.min(done * session.partSize, session.fileSize);
}

export function failedParts(session: UploadSession): PartRecord[] {
  return session.parts.filter((p) => p.status === 'failed');
}