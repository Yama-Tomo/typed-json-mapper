import * as t from './test_class';

const toJson = (val: unknown) => JSON.parse(JSON.stringify(val));

afterEach(() => {
  t.toNullableString.mockClear();
});

test('Mapping with valid values', (): void => {
  const [actual, err] = t.Test.map({
    str: 'test1',
    camel_case_prop: 'test3',
    num: 1234,
    bool: true,
    nil: null,
    user: { name: 'user1' },
    friends: [{ name: 'user1', email: 'user1@example.com' }, { name: 'user2' }, { name: 'user3' }],
    array_of_string: ['test4'],
    nullable_str: 'test5',
    hogehoge: 1111,
  });

  const expected = {
    str: 'test1',
    camelCaseProp: 'test3',
    num: 1234,
    bool: true,
    nil: null,
    str2: 'test',
    user: { name: 'user1' },
    friends: [{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }],
    arrayOfString: ['test4'],
    nullableStr: 'test5',
  };

  expect(toJson(actual)).toStrictEqual(toJson(expected));
  expect(actual.method1()).toBe('string');
  expect(actual.getter1).toBe('[test1]');
  expect(err).toBe(undefined);
  expect(t.toNullableString).toBeCalledTimes(1);

  describe('disableKeyConvert is true', () => {
    const [actual, err] = t.Test.map(
      {
        str: 'test1',
        camelCaseProp: 'test3',
        num: 1234,
        bool: true,
        nil: null,
        str2: 'test',
        user: { name: 'user1' },
        friends: [
          { name: 'user1', email: 'user1@example.com' },
          { name: 'user2' },
          { name: 'user3' },
        ],
        arrayOfString: ['test4'],
        nullableStr: 'test5',
        hogehoge: 1111,
      },
      { disableTransformKeys: true }
    );

    expect(toJson(actual)).toStrictEqual(toJson(expected));
    expect(err).toBe(undefined);
  });
});

test('Mapping with null values', () => {
  const [actual, err] = t.Test.map({
    str: 'test1',
    camel_case_prop: 'test3',
    num: 1234,
    bool: false,
    nil: null,
    user: { name: 'user1' },
    friends: [{ name: 'user1', email: 'user1@example.com' }, { name: 'user2' }, { name: 'user3' }],
    array_of_string: ['test4'],
    nullable_str: null,
    hogehoge: 1111,
  });

  const expected = {
    str: 'test1',
    camelCaseProp: 'test3',
    num: 1234,
    bool: false,
    nil: null,
    str2: 'test',
    user: { name: 'user1' },
    friends: [{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }],
    arrayOfString: ['test4'],
    nullableStr: null,
  };

  expect(toJson(actual)).toStrictEqual(toJson(expected));
  expect(err).toBe(undefined);
  expect(t.toNullableString).toBeCalledTimes(1);
});

test('Mapping with empty values', () => {
  const [actual, err] = t.Test.map({});

  const expected = {
    str: '',
    camelCaseProp: 'default-value',
    num: -1,
    bool: false,
    nil: null,
    str2: 'test',
    user: { name: '' },
    friends: [],
    arrayOfString: [],
    nullableStr: 'default-value',
  };

  const expectedErrors = [
    '`Test.str` not exists mapping value.',
    '`Test.camelCaseProp` not exists mapping value.',
    '`Test.num` not exists mapping value.',
    '`Test.bool` not exists mapping value.',
    '`Test.nil` not exists mapping value.',
    '`Test.user` not exists mapping value.',
    '`Test.friends` not exists mapping value.',
    '`Test.arrayOfString` not exists mapping value.',
    '`Test.nullableStr` not exists mapping value.',
  ];

  expect(toJson(actual)).toStrictEqual(toJson(expected));
  expect(toJson(err)).toStrictEqual(expectedErrors);
});

test('Mapping with mismatched type values', (): void => {
  const [actual, err] = t.Test.map({
    str: 111,
    camel_case_prop: 2222,
    num: '1234',
    bool: '',
    nil: undefined,
    str2: undefined,
    user: { name: null },
    friends: [
      { name: 1111, email: 'user1#@example.com' },
      { name: true, email: 'user1#@example.com' },
      null,
    ],
    array_of_string: 1111,
    nullable_str: 1111,
    hogehoge: 1111,
  });

  const expected = {
    str: '111',
    camelCaseProp: '2222',
    num: 1234,
    bool: false,
    nil: null,
    str2: '',
    user: { name: '' },
    friends: [{ name: '1111' }, { name: 'true' }, { name: '' }],
    arrayOfString: [],
    nullableStr: '1111',
  };

  const expectedErrors = [
    '`Test.str` type mismatch. expected-type: `string` actual: `111`',
    '`Test.camelCaseProp` type mismatch. expected-type: `string` actual: `2222`',
    '`Test.num` type mismatch. expected-type: `number` actual: `"1234"`',
    '`Test.bool` type mismatch. expected-type: `boolean` actual: `""`',
    '`Test.nil` type mismatch. expected-type: `null` actual: `undefined`',
    '`Test.user` -> `User.name` type mismatch. expected-type: `string` actual: `null`',
    '`Test.friends.0` -> `User.name` type mismatch. expected-type: `string` actual: `1111`',
    '`Test.friends.1` -> `User.name` type mismatch. expected-type: `string` actual: `true`',
    '`Test.friends.2` -> `User.name` not exists mapping value.',
    '`Test.arrayOfString` type mismatch. expected-type: `array` actual: `1111`',
    '`Test.nullableStr` -> data type is number!',
  ];

  expect(toJson(actual)).toStrictEqual(toJson(expected));
  expect(toJson(err)).toStrictEqual(expectedErrors);
});
