// Minimal logger wrapper. Swap the internals for pino/winston later
// without touching any call sites.
const timestamp = () => new Date().toISOString();

export const logger = {
  info: (...args) => console.log(`[INFO] ${timestamp()}`, ...args),
  warn: (...args) => console.warn(`[WARN] ${timestamp()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${timestamp()}`, ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${timestamp()}`, ...args);
    }
  },
};
