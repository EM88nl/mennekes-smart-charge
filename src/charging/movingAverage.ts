export class MovingAverage {
  private values: number[] = [];
  private maxSize: number;
  private lastUpdateTime: number = 0;
  private updateIntervalMs: number;

  constructor(windowMinutes: number, updateIntervalMinutes: number = 1) {
    this.maxSize = windowMinutes / updateIntervalMinutes;
    this.updateIntervalMs = updateIntervalMinutes * 60 * 1000;
  }

  addValue(value: number): void {
    const now = Date.now();

    // Only add if enough time has passed since last update (1 minute)
    if (now - this.lastUpdateTime < this.updateIntervalMs) {
      return;
    }

    this.values.push(value);
    this.lastUpdateTime = now;

    // Keep only the last maxSize values
    if (this.values.length > this.maxSize) {
      this.values.shift();
    }
  }

  getAverage(): number {
    if (this.values.length === 0) {
      return 0;
    }

    const sum = this.values.reduce((acc, val) => acc + val, 0);
    return sum / this.values.length;
  }

  getCount(): number {
    return this.values.length;
  }

  isFull(): boolean {
    return this.values.length >= this.maxSize;
  }

  clear(): void {
    this.values = [];
    this.lastUpdateTime = 0;
  }
}
