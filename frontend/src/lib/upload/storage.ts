import type { UploadSession } from './types';

const PREFIX = 'mpu.session.';

function readAll(): UploadSession[] {
  try {
    const out: UploadSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as UploadSession;
      if (parsed && parsed.documentId) out.push(parsed);
    }
    return out;
  } catch {
    return [];
  }
}

export function loadSession(documentId: string): UploadSession | null {
  try {
    const raw = localStorage.getItem(PREFIX + documentId);
    return raw ? (JSON.parse(raw) as UploadSession) : null;
  } catch {
    return null;
  }
}

export function loadSessions(): UploadSession[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveSession(session: UploadSession): void {
  try {
    localStorage.setItem(PREFIX + session.documentId, JSON.stringify(session));
  } catch {
    // localStorage full or blocked; the in-memory session still works.
  }
}

export function removeSession(documentId: string): void {
  try {
    localStorage.removeItem(PREFIX + documentId);
  } catch {
    // ignore
  }
}