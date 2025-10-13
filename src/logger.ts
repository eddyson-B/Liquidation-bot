export class Logger {
  constructor(private verbose: boolean = false) {}

  info(message: string, ...args: any[]) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (this.verbose) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  success(message: string, ...args: any[]) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  stats(stats: any) {
    console.log('\n=== LIQUIDATION STATS ===');
    console.log(JSON.stringify(stats, null, 2));
    console.log('========================\n');
  }
}
