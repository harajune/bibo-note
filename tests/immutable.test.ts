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