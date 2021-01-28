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
      "× property: useUndefType  message: can't use only undefined type. use `null` instead",
      '',
      "× property: useNonNullAssertion  message: can't use Non-null assertion operator. property initialization is required",
      '',
      '× property: notUseMapDecoratorUnionTypes  message: `@map` decorator required if union type or custom type',
      '',
      '× property: notUseMapDecoratorCustomType  message: `@map` decorator required if union type or custom type',
      '',
      '× property: notUseMapDecoratorArray  message: `@map` decorator required if array type property',
      '',
      '× property: wrongType1  message: type mismatch',
      '   property type: string',
      '   custom mapper type: number',
      '',
      '× property: wrongType2  message: type mismatch',
      '   property type: number | undefined',
      '   custom mapper type: number | null',
      '',
      '× property: wrongType3  message: type mismatch',
      '   property type: string',
      '   custom mapper type: User',
      '',
      '× property: wrongType4  message: type mismatch',
      '   property type: number | undefined',
      '   custom mapper type: number | null',
      '',
      '× property: multipleMapDecoratorCall  message: `@map` decorator is called multiple times. it must be called only once.',
      '',
    ],
    WrongTypeClass2: [
      '× property: wrongType  message: type mismatch',
      '   property type: number',
      '   custom mapper type: string',
      '',
    ],
  };

  expect(actual).toStrictEqual(expected);
});
