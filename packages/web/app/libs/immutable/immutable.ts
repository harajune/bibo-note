type ImmutablePrimitive = undefined | null | boolean | string | number | Function;

export type Immutable<T> = 
  T extends ImmutablePrimitive ? T :
  T extends Array<infer U> ? ImmutableArray<U> :
  T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
  T extends Set<infer U> ? ImmutableSet<U> : ImmutableObject<T>
  & {
    copy(): Immutable<T>;
    copyWith(updates: Partial<T>): Immutable<T>;
    equals(other: any): boolean;
  };

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>> & {
  copy(): ImmutableArray<T>;
  copyWith(updates: { [index: number]: T }): ImmutableArray<T>;
  equals(other: any): boolean;
};

export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>> & {
  copy(): ImmutableMap<K, V>;
  copyWith(updates: { [key: string]: V }): ImmutableMap<K, V>;
  equals(other: any): boolean;
};

export type ImmutableSet<T> = ReadonlySet<Immutable<T>> & {
  equals(other: any): boolean;
};
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export function createImmutable<T extends object>(obj: T): Immutable<T> {
  // 既にfreezeされているオブジェクトは処理をスキップ
  if (Object.isFrozen(obj)) {
    return obj as Immutable<T>;
  }

  // オブジェクトの各プロパティを再帰的に処理
  if (obj instanceof Set) {
    // Setの場合は新しいSetを作成し、各要素をImmutableに変換
    const immutableSet = new Set();
    for (const value of obj) {
      if (value && typeof value === 'object') {
        immutableSet.add(createImmutable(value));
      } else {
        immutableSet.add(value);
      }
    }
    
    addImmutableMethods(immutableSet);
    // little hack to avoid ambiguous type error
    return Object.freeze(immutableSet) as unknown as Immutable<T>;
  }

  // Mapの場合
  if (obj instanceof Map) {
    const keys = obj.keys();
    for (const key of keys) {
      const value = obj.get(key);
      if (value && typeof value === 'object') {
        obj.set(key, createImmutable(value));
      } else {
        obj.set(key, value);
      }
    }
    addImmutableMethods(obj);
    return Object.freeze(obj) as unknown as Immutable<T>;
  }

  // Object用の処理
  const keys = Object.keys(obj);
  for (const key of keys) {
    const value = obj[key as keyof T];
    if (value && typeof value === 'object') {
      obj[key as keyof T] = createImmutable(value) as T[keyof T];
    }
  }

  addImmutableMethods(obj);

  return Object.freeze(obj) as Immutable<T>;
}

function addImmutableMethods<T>(obj: T) {
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
    },
    equals: {
      value: function(other: any): boolean {
        if (this === other) return true;
        if (!other || typeof other !== 'object') return false;

        if (Array.isArray(this)) {
          if (!Array.isArray(other) || this.length !== other.length) return false;
          return this.every((item, index) => 
            item && typeof item === 'object' 
              ? item.equals(other[index])
              : item === other[index]
          );
        }

        if (this instanceof Map) {
          if (!(other instanceof Map) || this.size !== other.size) return false;
          for (const [key, value] of this.entries()) {
            const otherValue = other.get(key);
            if (value && typeof value === 'object') {
              if (!value.equals(otherValue)) return false;
            } else if (value !== otherValue) {
              return false;
            }
          }
          return true;
        }

        if (this instanceof Set) {
          if (!(other instanceof Set) || this.size !== other.size) return false;
          for (const value of this) {
            let found = false;
            for (const otherValue of other) {
              if (value && typeof value === 'object') {
                if (value.equals(otherValue)) {
                  found = true;
                  break;
                }
              } else if (value === otherValue) {
                found = true;
                break;
              }
            }
            if (!found) return false;
          }
          return true;
        }

        const keys = Object.keys(this);
        if (keys.length !== Object.keys(other).length) return false;

        return keys.every(key => {
          const value = this[key];
          const otherValue = other[key];
          return value && typeof value === 'object'
            ? value.equals(otherValue)
            : value === otherValue;
        });
      },
      enumerable: false
    }
  });
}