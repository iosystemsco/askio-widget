/**
 * Logger utility
 * Provides conditional logging based on environment
 * In production builds, all logs are removed by Terser
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Development-only logger
 * These calls will be removed in production by Terser
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },

  group: (label: string) => {
    if (isDevelopment && console.group) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  },

  table: (data: any) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },

  time: (label: string) => {
    if (isDevelopment && console.time) {
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  },
};

/**
 * Performance measurement utility
 * Only active in development
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(label: string): void {
    if (isDevelopment) {
      this.marks.set(label, performance.now());
    }
  }

  end(label: string): number | null {
    if (!isDevelopment) return null;

    const startTime = this.marks.get(label);
    if (!startTime) {
      logger.warn(`Performance mark "${label}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    logger.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  measure(label: string, fn: () => void): void {
    if (!isDevelopment) {
      fn();
      return;
    }

    this.start(label);
    fn();
    this.end(label);
  }

  async measureAsync(label: string, fn: () => Promise<void>): Promise<void> {
    if (!isDevelopment) {
      await fn();
      return;
    }

    this.start(label);
    await fn();
    this.end(label);
  }
}

/**
 * Create a singleton performance monitor
 */
export const perfMonitor = new PerformanceMonitor();
