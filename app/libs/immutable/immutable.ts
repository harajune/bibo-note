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

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>> & {
  copy(): ImmutableArray<T>;
  copyWith(updates: { [index: number]: T }): ImmutableArray<T>;
};

export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>> & {
  copy(): ImmutableMap<K, V>;
  copyWith(updates: { [key: string]: V }): ImmutableMap<K, V>;
};

export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export function createImmutable<T extends object>(obj: T): Immutable<T> {
  // 既にfreezeされているオブジェクトは処理をスキップ
  if (Object.isFrozen(obj)) {
    return obj as Immutable<T>;
  }

  // オブジェクトの各プロパティを再帰的に処理
  for (const key of Object.keys(obj)) {
    const value = obj[key as keyof T];
    if (value && typeof value === 'object') {
      obj[key as keyof T] = createImmutable(value) as T[keyof T];
    }
  }

  // copy と copyWith メソッドの追加
  Object.defineProperties(obj, {
    copy: {
      value: function() {
        return createImmutable({...this});
      },
      enumerable: false
    },
    copyWith: {
      value: function(updates: Partial<T>) {
        if (Array.isArray(this)) {
          const newArray = [...this];
          if (typeof updates === 'object') {
            Object.entries(updates).forEach(([index, value]) => {
              newArray[Number(index)] = value;
            });
          }
          return createImmutable(newArray);
        }
        
        if (this instanceof Map) {
          const newMap = new Map(this);
          if (typeof updates === 'object') {
            Object.entries(updates).forEach(([key, value]) => {
              newMap.set(key, value);
            });
          }
          return createImmutable(newMap);
        }
        
        return createImmutable({...this, ...updates});
      },
      enumerable: false
    }
  });

  return Object.freeze(obj) as Immutable<T>;
}
