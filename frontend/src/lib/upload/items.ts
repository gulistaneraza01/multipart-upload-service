import type { PickItem } from './types';

const VIDEO_EXTENSIONS = [
  'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', 'mpg', 'mpeg', 'wmv', 'flv',
];

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const name = file.name.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => name.endsWith(`.${ext}`));
}

function pickItemForRelPath(file: File, relPath: string): PickItem | null {
  if (!isVideoFile(file)) return null;
  const folderPath = relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : '';
  return { file, filePath: relPath, folderPath };
}

/**
 * Map files from <input type="file"> (single, multiple, or directory) to
 * items. Directory inputs populate File.webkitRelativePath automatically.
 */
export function itemsFromFileList(fileList: FileList): PickItem[] {
  const items: PickItem[] = [];
  for (const file of Array.from(fileList)) {
    const relPath = file.webkitRelativePath || file.name;
    const item = pickItemForRelPath(file, relPath);
    if (item) items.push(item);
  }
  return items;
}

function readAllEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const next = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) resolve(all);
          else {
            all.push(...entries);
            next();
          }
        },
        reject,
      );
    };
    next();
  });
}

function walkEntry(entry: FileSystemEntry, base: string): Promise<PickItem[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file(
        (file) => {
          const relPath = base ? `${base}/${file.name}` : file.name;
          resolve(pickItemForRelPath(file, relPath) ? [pickItemForRelPath(file, relPath)!] : []);
        },
        () => resolve([]),
      );
    });
  }

  if (entry.isDirectory) {
    const dir = entry as FileSystemDirectoryEntry;
    const childBase = base ? `${base}/${entry.name}` : entry.name;
    return walkDirectory(dir, childBase);
  }

  return Promise.resolve([]);
}

async function walkDirectory(
  dir: FileSystemDirectoryEntry,
  base: string,
): Promise<PickItem[]> {
  const entries = await readAllEntries(dir.createReader()).catch(() => []);
  const nested = await Promise.all(entries.map((child) => walkEntry(child, base)));
  return nested.flat();
}

/** Map a drop event's items into upload items, walking any dropped folders. */
export async function itemsFromDrop(
  dataTransfer: DataTransfer,
): Promise<PickItem[]> {
  const entries: (FileSystemEntry | null | undefined)[] = Array.from(
    dataTransfer.items,
  ).map((item) => item.webkitGetAsEntry?.());

  if (entries.length > 0) {
    const items = (
      await Promise.all(entries.map((entry) => (entry ? walkEntry(entry, '') : [])))
    ).flat();
    if (items.length > 0) return items;
  }

  return itemsFromFileList(dataTransfer.files);
}