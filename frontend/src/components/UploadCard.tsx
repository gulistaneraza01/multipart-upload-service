import { CheckCircle2, CirclePause, RefreshCw, Trash2, Video as VideoIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { LiveState } from '@/hooks/useUploadManager';
import { bytesUploaded, failedParts } from '@/lib/upload/engine';
import { formatBytes, formatPercent } from '@/lib/upload/format';
import type { UploadSession } from '@/lib/upload/types';

interface Props {
  session: UploadSession;
  live: LiveState;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onAbort: () => void;
  onClear: () => void;
}

const chipClass: Record<string, string> = {
  done: 'bg-emerald-500',
  uploading: 'bg-blue-500 animate-pulse',
  failed: 'bg-red-500',
  pending: 'bg-muted border border-input',
};

export function UploadCard({ session, live, onPause, onResume, onRetry, onAbort, onClear }: Props) {
  const uploaded = bytesUploaded(session);
  const failed = failedParts(session);
  const doneCount = session.parts.filter((p) => p.status === 'done').length;
  const percent = formatPercent(uploaded, session.fileSize);

  let statusBadge: { label: string; className: string };
  if (session.status === 'completed') {
    statusBadge = { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  } else if (session.status === 'aborted') {
    statusBadge = { label: 'Aborted', className: 'bg-red-500/15 text-red-600 dark:text-red-400' };
  } else if (failed.length > 0 && !live.running && !live.paused) {
    statusBadge = { label: `${failed.length} part${failed.length > 1 ? 's' : ''} failed`, className: 'bg-red-500/15 text-red-600 dark:text-red-400' };
  } else if (live.paused) {
    statusBadge = { label: 'Paused', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
  } else {
    statusBadge = { label: 'Uploading', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <VideoIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={session.filePath}>
            {session.filePath}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(uploaded)} / {formatBytes(session.fileSize)} · {doneCount}/{session.totalParts} parts
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </header>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {session.status === 'completed' && session.result ? (
        <Footer label="Object ready">
          <a
            href={session.result.location}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline decoration-dotted underline-offset-4"
          >
            {session.result.location}
          </a>
        </Footer>
      ) : null}

      {session.parts.length > 0 && session.status === 'uploading' ? (
        <div className="mt-3 grid max-h-28 grid-cols-[repeat(auto-fill,minmax(12px,1fr))] gap-1 overflow-y-auto pr-1">
          {session.parts.map((part) => (
            <span
              key={part.partNumber}
              title={`Part ${part.partNumber}: ${part.status}${part.error ? ` — ${part.error}` : ''}`}
              className={`size-3 rounded-[3px] ${chipClass[part.status] ?? chipClass.pending}`}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {session.status === 'uploading' ? (
          <>
            {live.running && !live.paused ? (
              <Button variant="secondary" size="sm" onClick={onPause}>
                <CirclePause /> Pause
              </Button>
            ) : null}
            {!live.running && !live.paused && doneCount > 0 && failed.length === 0 ? (
              <Button variant="secondary" size="sm" onClick={onResume}>
                <RefreshCw /> Complete
              </Button>
            ) : null}
            {failed.length > 0 && !live.running && !live.paused ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                <RefreshCw /> Retry {failed.length} failed
              </Button>
            ) : null}
            {live.running && live.paused ? (
              <Button variant="secondary" size="sm" onClick={onResume}>
                Resume
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onAbort}>
              <Trash2 /> Abort
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onClear}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
    </section>
  );
}

function Footer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}