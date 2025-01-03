type ImmutablePrimitive = undefined | null | boolean | string | number | Function;

export type Immutable<T> = 
  T extends ImmutablePrimitive ? T :
  T extends Array<infer U> ? ImmutableArray<U> :
  T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
  T extends Set<infer U> ? ImmutableSet<U> : ImmutableObject<T>
  & {
    copy(): Immutable<T>;
    copyWith(updates: Partial<T>): Immutable<T>;
  };

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export function createImmutable<T extends object>(obj: T): Immutable<T> {
  // オブジェクトの各プロパティを再帰的に処理
  const handler: ProxyHandler<T> = {
    get(target: T, prop: string | symbol) {
      const value = target[prop as keyof T];
      
      // copy と copyWith メソッドの実装
      if (prop === 'copy') {
        return () => createImmutable({...target});
      }
      if (prop === 'copyWith') {
        return (updates: Partial<T>) => 
          createImmutable({...target, ...updates});
      }

      // ネストされたオブジェクトや配列も不変にする
      if (value && typeof value === 'object') {
        return createImmutable(value);
      }
      
      return value;
    },

    set() {
      throw new Error('Cannot modify immutable object');
    },

    deleteProperty() {
      throw new Error('Cannot delete property from immutable object');
    }
  };

  return new Proxy(obj, handler) as Immutable<T>;
}
