type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };
  }

  info(message: string, context?: Record<string, unknown>) {
    const entry = this.formatEntry('info', message, context);
    console.log(JSON.stringify(entry));
  }

  warn(message: string, context?: Record<string, unknown>) {
    const entry = this.formatEntry('warn', message, context);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    const entry = this.formatEntry('error', message, {
      ...context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
    console.error(JSON.stringify(entry));
  }
}

export const logger = new Logger();
