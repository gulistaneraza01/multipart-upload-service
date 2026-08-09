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
    .replace(/\s+/g, '_')
    .replace(/^[.\s_]+|[.\s_]+$/g, '')
    .slice(0, MAX_NAME_LENGTH);
}

/**
 * Build a unique, S3-safe object key.
 *
 * Returns `${uuid}-${sanitized}` when the sanitized name is non-empty,
 * otherwise falls back to a bare UUID so the key is always valid.
 */
export function buildObjectKey(fileName) {
  const id = uuidv4();
  const safe = sanitizeFileName(fileName);
  return safe ? `${id}-${safe}` : id;
}