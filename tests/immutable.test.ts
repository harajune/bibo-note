import { describe, it, expect } from 'vitest';
import { createImmutable } from '../app/libs/immutable/immutable';

describe('Immutable', () => {
  // 基本的なオブジェクトの作成とイミュータビリティのテスト
  it('should create an immutable object', () => {
    const original = { name: 'test', value: 42 };
    const immutable = createImmutable(original);

    expect(immutable.name).toBe('test');
    expect(immutable.value).toBe(42);

    // プロパティの直接変更を試みる（TypeScriptではコンパイルエラーになりますが、実行時の確認として）
    expect(() => {
      (immutable as any).name = 'modified';
    }).toThrow();
  });

  // copyメソッドのテスト
  it('should create a copy with the same values', () => {
    const original = { name: 'test', value: 42 };
    const immutable = createImmutable(original);
    const copied = immutable.copy();

    expect(copied).not.toBe(immutable); // 異なるオブジェクトであることを確認
    expect(copied.name).toBe(immutable.name);
    expect(copied.value).toBe(immutable.value);
  });

  // copyWithメソッドのテスト
  it('should create a new object with modified value using copyWith', () => {
    const original = { name: 'test', value: 42 };
    const immutable = createImmutable(original);
    const modified = immutable.copyWith({ name: 'modified' });

    expect(modified.name).toBe('modified');
    expect(modified.value).toBe(42);
    expect(immutable.name).toBe('test'); // 元のオブジェクトは変更されていないことを確認
  });

  // ネストされたオブジェクトのテスト
  it('should handle nested objects', () => {
    const original = {
      user: {
        name: 'test',
        settings: {
          theme: 'dark'
        }
      }
    };
    const immutable = createImmutable(original);

    // ネストされたプロパティへのアクセス
    expect(immutable.user.settings.theme).toBe('dark');

    // ネストされたオブジェクトもイミュータブルであることを確認
    expect(() => {
      (immutable.user as any).name = 'modified';
    }).toThrow();

    expect(() => {
      (immutable.user.settings as any).theme = 'light';
    }).toThrow();
  });

  // 配列を含むオブジェクトのテスト
  it('should handle arrays', () => {
    const original = {
      name: 'test',
      items: [1, 2, 3],
      nested: [{ id: 1 }, { id: 2 }]
    };
    const immutable = createImmutable(original);

    expect(immutable.items).toEqual([1, 2, 3]);
    expect(immutable.nested[0].id).toBe(1);

    // 配列の変更を試みる
    expect(() => {
      (immutable.items as any).push(4);
    }).toThrow();

    // ネストされた配列内のオブジェクトの変更を試みる
    expect(() => {
      (immutable.nested[0] as any).id = 99;
    }).toThrow();
  });

  // プリミティブ値を含むオブジェクトのテスト
  it('should handle primitive values correctly when converted to Immutable', () => {
    const original = {
      string: 'hello',
      number: 42,
      boolean: true,
      nullValue: null,
      undefinedValue: undefined,
      func: () => 'test'
    };
    const immutable = createImmutable(original);

    // プリミティブ値が正しく保持されているか確認
    expect(immutable.string).toBe('hello');
    expect(immutable.number).toBe(42);
    expect(immutable.boolean).toBe(true);
    expect(immutable.nullValue).toBeNull();
    expect(immutable.undefinedValue).toBeUndefined();
    expect(immutable.func()).toBe('test');

    // プリミティブ値の変更を試みる
    expect(() => {
      (immutable as any).string = 'modified';
    }).toThrow();
  });
});

describe('createImmutable', () => {
  describe('copyWith for Array', () => {
    it('should update specific indices in the array', () => {
      const original = createImmutable([1, 2, 3, 4]);
      const updated = original.copyWith({ 1: 20, 3: 40 });
      
      expect(updated).toEqual([1, 20, 3, 40]);
      expect(original).toEqual([1, 2, 3, 4]); // original array should remain unchanged
      expect(Object.isFrozen(updated)).toBe(true);
    });

    it('should create a copy with empty updates', () => {
      const original = createImmutable([1, 2, 3]);
      const copied = original.copyWith({});
      
      expect(copied).toEqual([1, 2, 3]);
      expect(copied).not.toBe(original);
      expect(Object.isFrozen(copied)).toBe(true);
    });
  });

  describe('copyWith for Map', () => {
    it('should update and add key-value pairs in the map', () => {
      const original = createImmutable(new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]));
      const updated = original.copyWith({
        'b': 20,
        'd': 40
      });
      
      expect(updated instanceof Map).toBe(true);
      expect(Array.from(updated.entries())).toEqual([
        ['a', 1],
        ['b', 20],
        ['c', 3],
        ['d', 40]
      ]);
      expect(Array.from(original.entries())).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]); // original map should remain unchanged
      expect(Object.isFrozen(updated)).toBe(true);
    });

    it('should create a copy with empty updates', () => {
      const original = createImmutable(new Map([['a', 1]]));
      const copied = original.copyWith({});
      
      expect(copied instanceof Map).toBe(true);
      expect(Array.from(copied.entries())).toEqual([['a', 1]]);
      expect(copied).not.toBe(original);
      expect(Object.isFrozen(copied)).toBe(true);
    });
  });
});

describe('equals method', () => {
  it('should compare primitive values correctly', () => {
    const obj1 = createImmutable({ value: 42, text: 'hello' });
    const obj2 = createImmutable({ value: 42, text: 'hello' });
    const obj3 = createImmutable({ value: 43, text: 'hello' });

    expect(obj1.equals(obj2)).toBe(true);
    expect(obj1.equals(obj3)).toBe(false);
  });

  it('should compare nested objects correctly', () => {
    const obj1 = createImmutable({
      user: { name: 'test', age: 25 },
      settings: { theme: 'dark' }
    });
    const obj2 = createImmutable({
      user: { name: 'test', age: 25 },
      settings: { theme: 'dark' }
    });
    const obj3 = createImmutable({
      user: { name: 'test', age: 26 },
      settings: { theme: 'dark' }
    });

    expect(obj1.equals(obj2)).toBe(true);
    expect(obj1.equals(obj3)).toBe(false);
  });

  it('should compare arrays correctly', () => {
    const arr1 = createImmutable([1, 2, { id: 3 }]);
    const arr2 = createImmutable([1, 2, { id: 3 }]);
    const arr3 = createImmutable([1, 2, { id: 4 }]);

    expect(arr1.equals(arr2)).toBe(true);
    expect(arr1.equals(arr3)).toBe(false);
  });

  it('should compare Maps correctly', () => {
    const map1 = createImmutable(new Map<string, number | { value: number }>([
      ['a', 1], 
      ['b', { value: 2 }]
    ]));
    const map2 = createImmutable(new Map<string, number | { value: number }>([
      ['a', 1], 
      ['b', { value: 2 }]
    ]));
    const map3 = createImmutable(new Map<string, number | { value: number }>([
      ['a', 1], 
      ['b', { value: 3 }]
    ]));

    expect(map1.equals(map2)).toBe(true);
    expect(map1.equals(map3)).toBe(false);
  });

  it('should compare Sets correctly', () => {
    const set1 = createImmutable(new Set([1, 2, { id: 3 }]));
    const set2 = createImmutable(new Set([1, 2, { id: 3 }]));
    const set3 = createImmutable(new Set([1, 2, { id: 4 }]));

    expect(set1.equals(set2)).toBe(true);
    expect(set1.equals(set3)).toBe(false);
  });

  it('should handle null and undefined values', () => {
    const obj1 = createImmutable({ a: null, b: undefined });
    const obj2 = createImmutable({ a: null, b: undefined });
    const obj3 = createImmutable({ a: null, b: null });

    expect(obj1.equals(obj2)).toBe(true);
    expect(obj1.equals(obj3)).toBe(false);
  });
}); 