import * as path from 'path';
import * as checkTool from '../src/lint';
import * as ts from 'typescript';
import chalk from 'chalk';

const currentLevel = chalk.level;
const disableChalk = () => {
  chalk.level = 0;
};

const restoreChalk = () => {
  chalk.level = currentLevel;
};

beforeAll(disableChalk);
afterAll(restoreChalk);

test('detect wrong code of type', (): void => {
  const checkFile = path.join(__dirname, 'test_class.ts');
  const program = ts.createProgram(
    [checkFile],
    checkTool.getCompilerOpts(path.join(__dirname, '..', 'tsconfig.json'))
  );
  const checker = program.getTypeChecker();

  const actual = checkTool.checkFile(program, checker, checkFile);
  const expected = {
    WrongTypeClass: [
      "× property: useUndefType(55:2) message: can't use only undefined type. use `null` instead",
      '',
      "× property: useNonNullAssertion(56:2) message: can't use Non-null assertion operator. property initialization is required",
      '',
      '× property: notUseMapDecoratorUnionTypes(57:2) message: `@map` decorator required if union type or custom type',
      '',
      '× property: notUseMapDecoratorCustomType(58:2) message: `@map` decorator required if union type or custom type',
      '',
      '× property: notUseMapDecoratorArray(59:2) message: `@map` decorator required if array type property',
      '',
      '× property: wrongType1(60:2) message: type mismatch',
      '   property type: string',
      '   custom mapper type: number',
      '',
      '× property: wrongType2(61:2) message: type mismatch',
      '   property type: number | undefined',
      '   custom mapper type: number | null',
      '',
      '× property: wrongType3(62:2) message: type mismatch',
      '   property type: string',
      '   custom mapper type: User',
      '',
      '× property: wrongType4(63:2) message: type mismatch',
      '   property type: number | undefined',
      '   custom mapper type: number | null',
      '',
      '× property: multipleMapDecoratorCall(64:2) message: `@map` decorator is called multiple times. it must be called only once.',
      '',
    ],
    WrongTypeClass2: [
      '× property: wrongType(73:2) message: type mismatch',
      '   property type: number',
      '   custom mapper type: string',
      '',
    ],
  };

  expect(actual).toStrictEqual(expected);
});
