import * as fs from 'node:fs';
import * as path from 'node:path';

export class Logger {
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = logPath;
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
  }

  private write(level: string, message: string): void {
    const formattedMessage = this.formatMessage(level, message);
    console.log(formattedMessage.trim());
    fs.appendFileSync(this.logPath, formattedMessage, 'utf-8');
  }

  info(message: string): void {
    this.write('INFO', message);
  }

  warn(message: string): void {
    this.write('WARN', message);
  }

  error(message: string, error?: Error): void {
    const errorMessage = error ? `${message}: ${error.message}\n${error.stack}` : message;
    this.write('ERROR', errorMessage);
  }

  debug(message: string): void {
    this.write('DEBUG', message);
  }
}
