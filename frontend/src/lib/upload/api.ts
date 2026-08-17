const API_BASE = '/api/v1';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: ApiEnvelope<T> = await res.json().catch(() => ({ success: false }));

  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }

  return json.data;
}

export interface InitiateParams {
  fileName: string;
  contentType: string;
  fileSize: number;
  folderPath?: string;
}

export interface InitiateResult {
  documentId: string;
  uploadId: string;
  key: string;
  partSize: number;
  totalParts: number;
}

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface PartBatch {
  documentId: string;
  uploadId: string;
  key: string;
  partSize: number;
  totalPart: number;
  parts: PresignedPart[];
}

export interface CompleteResult {
  documentId: string;
  uploadId: string;
  key: string;
  location: string;
  etag: string;
}

export function initiateUpload(params: InitiateParams): Promise<InitiateResult> {
  return post<InitiateResult>('/upload/initiate-upload', params);
}

export function fetchPartBatch(documentId: string): Promise<PartBatch> {
  return post<PartBatch>(`/upload/${documentId}/parts/batch`);
}

export async function fetchPartUrl(
  documentId: string,
  partNumber: number,
): Promise<string> {
  const data = await post<{ url: string }>(`/upload/${documentId}/parts`, {
    partNumber,
  });
  return data.url;
}

export function completeUpload(
  documentId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<CompleteResult> {
  return post<CompleteResult>(`/upload/${documentId}/complete`, { parts });
}

export function abortUpload(documentId: string): Promise<unknown> {
  return post<unknown>(`/upload/${documentId}/abort`);
}