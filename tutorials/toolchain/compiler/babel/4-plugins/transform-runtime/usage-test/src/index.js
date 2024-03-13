class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  toString() {
    return `(${this.x}, ${this.y})`;
  }
  async load() {
    await Promise.resolve();
    return Date.now();
  }
}

export default Point;
