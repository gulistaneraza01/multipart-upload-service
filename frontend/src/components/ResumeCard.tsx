import { FolderOpen, FileVideo } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { itemsFromFileList } from '@/lib/upload/items';
import type { UploadSession } from '@/lib/upload/types';

interface Props {
  session: UploadSession;
  onResume: (documentId: string, file: File) => void;
  onClear: (documentId: string) => void;
}

export function ResumeCard({ session, onResume, onClear }: Props) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const isFolder = session.folderPath !== '';

  const handleChosen = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const items = itemsFromFileList(fileList);
    const match = items.find(
      (item) => item.filePath === session.filePath && item.file.size === session.fileSize,
    );
    if (match) {
      setError(null);
      onResume(session.documentId, match.file);
    } else {
      setError(`Couldn't match "${session.filePath}". Select the same source file or folder.`);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          {isFolder ? <FolderOpen className="size-4" /> : <FileVideo className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={session.filePath}>
            {session.filePath}
          </p>
          <p className="text-xs text-muted-foreground">
            Incomplete upload · {session.parts.filter((p) => p.status === 'done').length}/
            {session.totalParts} parts uploaded
          </p>
        </div>
      </header>

      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => handleChosen(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        // @ts-expect-error webkitdirectory is a non-standard attribute
        webkitdirectory=""
        onChange={(e) => handleChosen(e.target.files)}
      />

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => (isFolder ? folderInputRef.current?.click() : fileInputRef.current?.click())}
        >
          {isFolder ? <FolderOpen /> : <FileVideo />} Resume upload
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onClear(session.documentId)}>
          Discard
        </Button>
      </div>
    </section>
  );
}