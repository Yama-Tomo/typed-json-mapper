import 'reflect-metadata';

const metadataKeyCustomMapper = 'custom:mapper';
const metadataKeyIgnoreError = 'custom:ignoreError';

type Errors = undefined | string[];
type CustomMapperFunc = (source: unknown) => [unknown, Errors];
type CustomMapper =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | CustomMapperFunc
  | typeof TypedJsonMapper;

const map = (mapper: CustomMapper) => (target: TypedJsonMapper, propertyKey: string): void => {
  Reflect.defineMetadata(metadataKeyCustomMapper, mapper, target, propertyKey);
};

const ignoreError = (target: TypedJsonMapper, propertyKey: string): void => {
  Reflect.defineMetadata(metadataKeyIgnoreError, true, target, propertyKey);
};

type Options = {
  disableTransformKeys?: boolean;
};

class TypedJsonMapper {
  static map<T extends typeof TypedJsonMapper>(
    this: T,
    data: unknown,
    options?: Options
  ): [InstanceType<T>, Errors] {
    return mapData(this, data, options);
  }
}

const mapData = <T extends typeof TypedJsonMapper>(
  klass: T,
  data: unknown,
  options?: Options
): [InstanceType<T>, Errors] => {
  const instance = new klass() as InstanceType<T>;
  const className = instance.constructor.name;
  const errors: string[] = [];

  Object.keys(instance).forEach((key) => {
    const convertKey = options?.disableTransformKeys === true ? key : toSnakeCase(key);
    const isIgnoreError = !!Reflect.getMetadata(metadataKeyIgnoreError, instance, key);

    if (!hasKey(data, convertKey)) {
      if (!isIgnoreError) {
        errors.push(`\`${className}.${key}\` not exists mapping value.`);
      }

      return;
    }

    const castKey = key as keyof typeof instance;
    const type = getType(instance, castKey);
    const customMapper = Reflect.getMetadata(metadataKeyCustomMapper, instance, key);
    const mapData = data[convertKey];

    instance[castKey] = cast(className, mapData, key, type, errors, isIgnoreError, customMapper);
  });

  return [instance, errors.length > 0 ? errors : undefined];
};

const getType = <T>(instance: T, propertyName: keyof T) => {
  const value = instance[propertyName];
  if (value === undefined) {
    return 'unknown';
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  const typeOf = typeof value;
  // TODO: support bigint type
  if (typeOf === 'string' || typeOf === 'number' || typeOf === 'boolean') {
    return typeOf;
  }

  return 'unknown';
};

const cast = (
  className: string,
  data: unknown,
  key: string,
  type: ReturnType<typeof getType>,
  errors: string[],
  isIgnoreError: boolean,
  customMapper?: CustomMapper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (type === 'array') {
    if (!Array.isArray(data)) {
      if (!isIgnoreError) {
        addTypeMismatchError(errors, className, key, type, data);
      }

      return [];
    }

    if (!customMapper) {
      return [];
    }

    return data.map((element, i) => {
      const [castValue, castErrors] = toCustomType(element, customMapper);
      if (castErrors && !isIgnoreError) {
        addCustomTypeMismatchError(errors, className, `${key}.${i}`, castErrors);
      }

      return castValue;
    });
  }

  if (customMapper) {
    const [castValue, castErrors] = toCustomType(data, customMapper);
    if (castErrors && !isIgnoreError) {
      addCustomTypeMismatchError(errors, className, key, castErrors);
    }

    return castValue;
  }

  if (type === 'number' || type === 'string' || type === 'boolean' || type === 'null') {
    const castFn =
      type === 'number'
        ? toNumber
        : type === 'string'
        ? toString
        : type === 'boolean'
        ? toBool
        : toNull;
    const [castVal, isCastError] = castFn(data);
    if (isCastError && !isIgnoreError) {
      addTypeMismatchError(errors, className, key, type, data);
    }

    return castVal;
  }

  return data;
};

const addTypeMismatchError = (
  errors: NonNullable<Errors>,
  className: string,
  propertyName: string,
  expectedType: string,
  actualVal: unknown
) => {
  errors.push(
    // prettier-ignore
    `\`${className}.${propertyName}\` type mismatch. expected-type: \`${expectedType}\` actual: \`${JSON.stringify(actualVal)}\``
  );
};

const addCustomTypeMismatchError = (
  errors: NonNullable<Errors>,
  className: string,
  propertyName: string,
  customTypeCastErrors: NonNullable<Errors>
) => {
  errors.push(...customTypeCastErrors.map((err) => `\`${className}.${propertyName}\` -> ${err}`));
};

const toSnakeCase = (str: string): string =>
  str.replace(/([A-Z])/g, (s) => '_' + s.charAt(0).toLowerCase());

const hasKey = <T extends string>(arg: unknown, key: T): arg is Record<T, unknown> =>
  (typeof arg === 'object' || typeof arg === 'function') && arg != null && key in arg;

const toNumber = (val: unknown): [number, boolean] => {
  const isInValid = typeof val !== 'number';
  const num = Number(val);
  return [Number.isNaN(num) ? 0 : num, isInValid];
};

const toString = (val: unknown): [string, boolean] => {
  const isInValid = typeof val !== 'string';
  return [val == null ? '' : String(val), isInValid];
};

const toBool = (val: unknown): [boolean, boolean] => {
  const isInValid = typeof val !== 'boolean';
  return [String(val) === 'true', isInValid];
};

const toNull = (val: unknown): [null, boolean] => {
  const isInValid = val !== null;
  return [null, isInValid];
};

const isTypedJsonMapperClass = (
  customMapper: CustomMapper
): customMapper is typeof TypedJsonMapper =>
  'map' in customMapper && typeof customMapper.map === 'function';

const toCustomType = (val: unknown, customMapper: CustomMapper) => {
  if (isTypedJsonMapperClass(customMapper)) {
    return customMapper.map(val);
  }

  const castVal = customMapper(val);
  return !Array.isArray(castVal) ? ([castVal, undefined] as const) : castVal;
};

export { map, ignoreError, TypedJsonMapper, Errors, CustomMapperFunc, CustomMapper, Options };
