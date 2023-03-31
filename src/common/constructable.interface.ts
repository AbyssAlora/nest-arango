export interface Constructable<T = any> {
  new (...args: any[]): T;
}
