export type Populated<T, K extends keyof T, V> = Omit<T, K> & {
  [P in K]: V;
};

export type PopulatedMany<T, P extends { [K in keyof T]?: unknown }> =
  Omit<T, keyof P> & P;
