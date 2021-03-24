import { TypedJsonMapper as Base, map, Errors, ignoreError } from '../src/';

const toNullableString = jest.fn((data: unknown): [string | null, Errors] => {
  const errors: Errors = typeof data === 'number' ? ['data type is number!'] : undefined;
  return [data != null ? String(data) : null, errors];
});

class User extends Base {
  name = '';
}

class Test extends Base {
  str = '';
  camelCaseProp = 'default-value';
  num = -1;
  bool = false;
  nil = null;
  @ignoreError str2 = 'test';
  @map(User) user: User = new User();
  @map(User) friends: User[] = [];
  @map(String) arrayOfString: string[] = [];

  @map(toNullableString) nullableStr: string | null = 'default-value';

  method1(): string {
    return 'string';
  }

  get getter1(): string {
    return `[${this.str}]`;
  }

  static staticProp = '111';
  static staticMethod1(): number {
    return 1111;
  }
}

// ------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class NotExtendsTypedJsonMapperClass {}

const toNullableNumber = (data: unknown): [number | null, Errors] => [
  data != null ? Number(data) : null,
  undefined,
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class WrongTypeClass extends Base {
  num = 0;
  bool = false;
  nil = null;
  @map(String) arr: string[] = [];

  useUndefType = undefined;
  useNonNullAssertion!: string;
  notUseMapDecoratorUnionTypes: string | null = null;
  notUseMapDecoratorCustomType: User = new User();
  notUseMapDecoratorArray: string[] = [];
  @map(Number) wrongType1 = '';
  @map(toNullableNumber) wrongType2: (number | undefined)[] = [];
  @map(User) wrongType3 = '';
  @map(toNullableNumber) wrongType4: Array<number | undefined>[] = [];
  @map(String) @map(Number) multipleMapDecoratorCall: number[] = [];
}

class Nest extends Base {
  id = Number.MIN_SAFE_INTEGER;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class WrongTypeClass2 extends Nest {
  @map(String) wrongType = 0;
}

export { Test, User, toNullableString };
