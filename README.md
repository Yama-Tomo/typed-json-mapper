# typed-json-mapper

Type-safe json mapper

# usage

## basic

```ts
import { TypedJsonMapper, map } from 'typed-json-mapper';

class Mapper extends TypedJsonMapper {
  str = '';
  num = Number.MIN_SAFE_INTEGER;
  bool = false;
  nil = null;
  @map(String) arrayOfStrings: string[] = [];
}

// ------------------
const [mapper, err] = Mapper.map({ str: 'str', num: 123, bool: true, nil: null, array_of_strings: ['a', 'b'] });

/*
mapper => Mapper {
  str: 'str',
  num: 123,
  bool: true,
  nil: null,
  arrayOfStrings: ['a', 'b']
}
*/
```

## array type mapping

Use `@map` decorator. **(must)**

```ts
class Mapper extends TypedJsonMapper {
  @map(String) arrayOfString: string[] = [];
  @map(Number) arrayOfNumber: number[] = [];
}
```

## complex type mapping

- custom type
  - Implement a mapper class that inherit from `TypeJsonMapper`, and pass it to `@map` decorator.
- union type
  - Implement a mapper functions, and pass it to `@map` decorator.
  
```ts
import { TypedJsonMapper, map, Errors } from 'typed-json-mapper';

// you should implement mapper class
class CustomType extends TypedJsonMapper {
  id = -1;
  str = '';
}

// you should implement mapper function
const toNullableString = (data: unknown): [string | null, Errors] => {
  const errors: Errors = typeof data === 'number' ? ['data type is number!'] : undefined;
  return [data != null ? String(data) : null, errors];
}

class Mapper extends TypedJsonMapper {
  // custom type
  @map(CustomType) custom: CustomType = new CustomType();
  // custom type + array
  @map(CustomType) arrayOfCustom: CustomType[] = [];

  // union type
  @map(toNullableString) nullableStr: string | null = null;
  // union type + array
  @map(toNullableString) nullableStrings: (string | null)[] = [];
}
```

## error handling
```ts
const toNullableString = (data: unknown): [string | null, Errors] => {
  const errors: Errors = typeof data === 'number' ? ['data type is number!'] : undefined;
  return [data != null ? String(data) : null, errors];
}

class Mapper extends TypedJsonMapper {
  str = '';
  num = -1
  @map(toNullableString) nullableStr: string | null = 'default';
}

const [mapper, err] = Mapper.map({ nullable_str: 111 }); 
if (err) {
  // something error handling
  /* 
  err => [
    '`Mapper.str` not exists mapping value.',
    '`Mapper.num` type mismatch. expected-type: `number` actual: `"string"`',
    '`Mapper.nullableStr` -> data type is number!'
  ] 
  */
}

/*
mapper => Mapper {
  nullableStr: "111",
  num: 0,
  str: "",
}
*/
```

# limitation

- Can't use Non-null assertion operator.
- Can't use undefined type for property, use `null` instead

# linter

The typescript compiler can't detect mismatches between property types and mapper return types.

for example

```typescript
class WrongTypeClass extends TypedJsonMapper {
  @map(String) list: number[] = []; // <--- mapper return type = string, property type = number.
                                    // A mismatch occurs, but no compile error occurs.
}
```

Check for such mismatches with this tool.

```bash
$ npx mapper-code-lint ./src/**/*.ts

or

$ yarn mapper-code-lint ./src/**/*.ts
```

# license
MIT


