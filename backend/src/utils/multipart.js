const DEFAULT_PART_SIZE = 10 * 1024 * 1024; // 10MB

export function getPartSize(size = DEFAULT_PART_SIZE) {
  return size;
}

export function calculateTotalParts(fileSize, partSize = DEFAULT_PART_SIZE) {
  return Math.ceil(fileSize / partSize);
}

export function buildMultipartConfig(fileSize, partSize = DEFAULT_PART_SIZE) {
  return {
    partSize,
    totalParts: calculateTotalParts(fileSize, partSize),
  };
}