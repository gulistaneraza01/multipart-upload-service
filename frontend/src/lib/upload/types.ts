export type PartStatus = 'pending' | 'uploading' | 'done' | 'failed';
export type UploadStatus = 'uploading' | 'completed' | 'aborted';

export interface PartRecord {
  partNumber: number;
  status: PartStatus;
  etag: string | null;
  attempts: number;
  error?: string;
}

export interface UploadResult {
  key: string;
  location: string;
  etag: string;
}

export interface UploadSession {
  documentId: string;
  uploadId: string;
  key: string;
  /** Relative path including folders, e.g. "videos/trip/intro.mp4" */
  filePath: string;
  /** Relative directory, e.g. "videos/trip" ('' when none) */
  folderPath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  partSize: number;
  totalParts: number;
  createdAt: number;
  status: UploadStatus;
  parts: PartRecord[];
  result?: UploadResult;
}

export interface PickItem {
  file: File;
  filePath: string;
  folderPath: string;
}