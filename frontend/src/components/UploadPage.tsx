import { CloudUpload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { ResumeCard } from '@/components/ResumeCard';
import { UploadCard } from '@/components/UploadCard';
import { Button } from '@/components/ui/button';
import { useUploadManager } from '@/hooks/useUploadManager';
import { itemsFromDrop, itemsFromFileList } from '@/lib/upload/items';
import type { UploadSession } from '@/lib/upload/types';

export function UploadPage() {
  const {
    sessions,
    live,
    engineIds,
    uploadItems,
    pauseUpload,
    resumeUpload,
    retryFailed,
    abortUpload,
    clearSession,
    resumeSessionWithFile,
  } = useUploadManager();

  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    uploadItems(itemsFromFileList(fileList));
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.items?.length) {
      void itemsFromDrop(e.dataTransfer).then(uploadItems);
    } else if (e.dataTransfer.files?.length) {
      uploadItems(itemsFromFileList(e.dataTransfer.files));
    }
  };

  const resumeCandidates = sessions.filter(
    (s) => s.status === 'uploading' && !engineIds.includes(s.documentId),
  );
  const activeCards = sessions.filter(
    (s) => s.status === 'uploading' && engineIds.includes(s.documentId),
  );
  const doneCards = sessions.filter((s) => s.status !== 'uploading');

  const renderCard = (session: UploadSession) =>
    session.status === 'uploading' && !engineIds.includes(session.documentId) ? (
      <ResumeCard
        key={session.documentId}
        session={session}
        onResume={resumeSessionWithFile}
        onClear={clearSession}
      />
    ) : (
      <UploadCard
        key={session.documentId}
        session={session}
        live={
          live[session.documentId] ?? {
            running: session.status === 'uploading',
            paused: false,
          }
        }
        onPause={() => pauseUpload(session.documentId)}
        onResume={() => resumeUpload(session.documentId)}
        onRetry={() => retryFailed(session.documentId)}
        onAbort={() => abortUpload(session.documentId)}
        onClear={() => clearSession(session.documentId)}
      />
    );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Video uploader</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multiple-part uploads with resume, pause, and automatic retry. You can close the tab —
          partial uploads are saved and can be continued.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-card'
        }`}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <CloudUpload className="size-7 text-primary" />
        </span>
        <div>
          <p className="text-sm font-medium">Drag & drop videos here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Video files or whole folders are supported
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            // @ts-expect-error webkitdirectory is a non-standard attribute
            webkitdirectory=""
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Choose video
          </Button>
          <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
            Choose folder
          </Button>
        </div>
      </div>

      {resumeCandidates.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Resumable uploads ({resumeCandidates.length})
          </h2>
          <div className="flex flex-col gap-3">{resumeCandidates.map(renderCard)}</div>
        </section>
      ) : null}

      {activeCards.length > 0 || doneCards.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Uploads</h2>
          <div className="flex flex-col gap-3">
            {activeCards.map(renderCard)}
            {doneCards.map(renderCard)}
          </div>
        </section>
      ) : null}
    </main>
  );
}