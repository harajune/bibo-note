
class Logger {
  private static readonly logger = new Logger();

  private constructor() {}

  public static getInstance() {
    return Logger.logger;
  }

  info(message: any, ...args: any[]) {
    console.info(message, ...args);
  }

  error(message: any, ...args: any[]) {
    console.error(message, ...args);
  }
}

export const logger = Logger.getInstance();
