import { initiateUpload } from '@/lib/upload/api';
import { UploadEngine } from '@/lib/upload/engine';
import { loadSessions, removeSession, saveSession } from '@/lib/upload/storage';
import type { PickItem, UploadSession } from '@/lib/upload/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const MAX_CONCURRENT_FILES = 2;

export interface LiveState {
  running: boolean;
  paused: boolean;
}

function initialSession(
  item: PickItem,
  init: Awaited<ReturnType<typeof initiateUpload>>,
): UploadSession {
  return {
    documentId: init.documentId,
    uploadId: init.uploadId,
    key: init.key,
    filePath: item.filePath,
    folderPath: item.folderPath ?? '',
    fileName: item.file.name,
    contentType: item.file.type || 'application/octet-stream',
    fileSize: item.file.size,
    partSize: init.partSize,
    totalParts: init.totalParts,
    createdAt: Date.now(),
    status: 'uploading',
    parts: Array.from({ length: init.totalParts }, (_, i) => ({
      partNumber: i + 1,
      status: 'pending' as const,
      etag: null,
      attempts: 0,
    })),
  };
}

export function useUploadManager() {
  const [sessions, setSessions] = useState<UploadSession[]>(() =>
    loadSessions(),
  );
  const [live, setLive] = useState<Record<string, LiveState>>({});
  const [engineIds, setEngineIds] = useState<string[]>([]);

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const enginesRef = useRef(new Map<string, UploadEngine>());
  const queueRef = useRef<PickItem[]>([]);
  const activeRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const patchSession = useCallback(
    (session: UploadSession, liveState?: LiveState) => {
      saveSession(session);
      if (!mountedRef.current) return;
      setSessions((prev) =>
        prev.some((s) => s.documentId === session.documentId)
          ? prev.map((s) => (s.documentId === session.documentId ? session : s))
          : [...prev, session],
      );
      if (liveState) {
        setLive((prev) => ({ ...prev, [session.documentId]: liveState }));
      }
    },
    [],
  );

  const makeEngine = useCallback(
    (session: UploadSession, file: File): UploadEngine => {
      const engine = new UploadEngine(session, file, {
        onUpdate: (next) =>
          patchSession(next, {
            running: engine.isRunning,
            paused: engine.isPaused,
          }),
        onComplete: (next) => {
          patchSession(next, { running: false, paused: false });
          toast.success(`${next.fileName} uploaded`, {
            description: `Object ready at ${next.result?.location}`,
          });
        },
      });
      enginesRef.current.set(session.documentId, engine);
      if (mountedRef.current) {
        setEngineIds((prev) =>
          prev.includes(session.documentId)
            ? prev
            : [...prev, session.documentId],
        );
      }
      return engine;
    },
    [patchSession],
  );

  const drainRef = useRef<() => void>(() => {});

  const runItem = useCallback(
    async (item: PickItem) => {
      try {
        const init = await initiateUpload({
          fileName: item.file.name,
          contentType: item.file.type || 'application/octet-stream',
          fileSize: item.file.size,
          folderPath: item.folderPath,
        });

        const session = initialSession(item, init);
        saveSession(session);
        if (mountedRef.current) {
          setSessions((prev) =>
            prev.some((s) => s.documentId === session.documentId)
              ? prev
              : [...prev, session],
          );
        }
        toast.success(`${item.file.name} started`, {
          description: `Key ${init.key}`,
        });

        const engine = makeEngine(session, item.file);
        await engine.start();
      } catch (err) {
        console.error('Upload failed to start:', err);
        toast.error(`Failed to start ${item.file.name}`, {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        activeRef.current -= 1;
        drainRef.current();
      }
    },
    [makeEngine],
  );

  const drain = useCallback(() => {
    while (activeRef.current < MAX_CONCURRENT_FILES) {
      const next = queueRef.current.shift();
      if (!next) break;
      activeRef.current += 1;
      void runItem(next);
    }
  }, [runItem]);
  drainRef.current = drain;

  const uploadItems = useCallback(
    (items: PickItem[]) => {
      queueRef.current.push(...items);
      drain();
    },
    [drain],
  );

  const pauseUpload = useCallback((documentId: string) => {
    enginesRef.current.get(documentId)?.pause();
  }, []);

  const resumeUpload = useCallback((documentId: string) => {
    enginesRef.current.get(documentId)?.resume();
  }, []);

  const retryFailed = useCallback((documentId: string) => {
    enginesRef.current.get(documentId)?.retryFailed();
  }, []);

  const abortUpload = useCallback((documentId: string) => {
    const engine = enginesRef.current.get(documentId);
    if (!engine) return;
    void (async () => {
      await engine.abort();
      removeSession(documentId);
      enginesRef.current.delete(documentId);
      if (mountedRef.current) {
        setSessions((prev) => prev.filter((s) => s.documentId !== documentId));
        setEngineIds((prev) => prev.filter((id) => id !== documentId));
      }
      toast.info('Upload aborted', {
        description: engine.session.fileName,
      });
    })();
  }, []);

  const clearSession = useCallback((documentId: string) => {
    removeSession(documentId);
    enginesRef.current.delete(documentId);
    if (mountedRef.current) {
      setSessions((prev) => prev.filter((s) => s.documentId !== documentId));
      setEngineIds((prev) => prev.filter((id) => id !== documentId));
    }
  }, []);

  const resumeSessionWithFile = useCallback(
    (documentId: string, file: File) => {
      const session = sessionsRef.current.find(
        (s) => s.documentId === documentId,
      );
      if (!session) return;

      const resuming = {
        ...session,
        status: 'uploading' as const,
        result: undefined,
      };
      patchSession(resuming, { running: true, paused: false });
      const engine = makeEngine(resuming, file);
      void engine.start();
      toast.info(`Resuming ${file.name}`, {
        description: `Uploading ${resuming.totalParts} parts`,
      });
    },
    [makeEngine, patchSession],
  );

  const reloadSessions = useCallback(() => {
    if (mountedRef.current) setSessions(loadSessions());
  }, []);

  return {
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
    reloadSessions,
  };
}
