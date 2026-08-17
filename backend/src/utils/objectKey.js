import { v4 as uuidv4 } from 'uuid';

// Max length of the sanitized leaf segment. Leaves room for the 36-char
// UUID prefix plus the dash in the assembled key.
const MAX_NAME_LENGTH = 200;

/**
 * Reduce an arbitrary client-provided filename to a string that is safe to
 * use as part of an S3 object key. Always returns a string; never throws.
 *
 * Rules:
 *  - Strip path separators (/, \) and control characters (\x00-\x1f, \x7f).
 *  - Remove `..` sequences (path-traversal defense).
 *  - Collapse runs of whitespace to a single underscore.
 *  - Trim leading/trailing whitespace and dots.
 *  - Truncate to MAX_NAME_LENGTH characters.
 */
export function sanitizeFileName(name) {
  if (typeof name !== 'string') return '';

  return name
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[/\\]/g, '')
    .replace(/\.\.+/g, '')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .replace(/\s+/g, '_')
    .slice(0, MAX_NAME_LENGTH);
}

/**
 * Reduce an optional client-provided folder path (e.g. "videos/trip/2024")
 * to a safe list of path segments joined by "/". Each segment goes through
 * the same sanitization as a filename so `..` traversal, backslashes, and
 * control characters can never escape the S3 prefix.
 */
export function sanitizeFolderPath(folderPath) {
  if (typeof folderPath !== 'string') return '';

  const segments = folderPath
    .split('/')
    .map((segment) => sanitizeFileName(segment))
    .filter(Boolean);

  if (segments.length === 0) return '';

  // Keep the whole prefix bounded so the assembled key stays under S3's
  // 1024-byte limit with room to spare.
  const joined = segments.join('/').slice(0, MAX_NAME_LENGTH);
  return joined.replace(/^\/+|\/+$/g, '');
}

/**
 * Build a unique, S3-safe object key.
 *
 * Returns `${uuid}-${sanitized}` when the sanitized name is non-empty,
 * otherwise falls back to a bare UUID so the key is always valid. When a
 * folderPath is provided the first slash is placed after the UUID prefix,
 * e.g. `${uuid}-videos/trip/report.pdf`, preserving the caller's folder
 * structure without allowing traversal.
 */
export function buildObjectKey(fileName, folderPath = '') {
  const id = uuidv4();
  const safe = sanitizeFileName(fileName);
  if (!safe) return id;

  const prefix = sanitizeFolderPath(folderPath);
  return prefix ? `${id}-${prefix}/${safe}` : `${id}-${safe}`;
}
