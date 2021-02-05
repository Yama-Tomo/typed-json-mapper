import * as ts from 'typescript';
import * as path from 'path';
import * as glob from 'glob';
import chalk from 'chalk';
import yargs from 'yargs';

const main = () => {
  const args = yargs(process.argv.splice(2))
    .usage('Usage: mapper-code-lint [-c] [-q | --quiet] [-v | --version] <check file path>')
    .options({
      c: { type: 'string', default: './tsconfig.json', description: '`tsconfig.json` path' },
      q: { type: 'boolean', alias: 'quiet', default: false, description: 'hide error messages' },
      v: { type: 'boolean', alias: 'version', default: false },
    })
    .demandCommand().argv;

  const checkFilePathPatterns = args._;
  const files = checkFilePathPatterns.reduce(
    (result, item) => result.concat(glob.sync(String(item), { ignore: 'node_modules' })),
    [] as string[]
  );

  if (files.length === 0) {
    process.exit(0);
  }

  const program = ts.createProgram(files, getCompilerOpts(args.c));
  const checker = program.getTypeChecker();

  let isError = false;
  files.forEach((file) => {
    const errorEveryClass = checkFile(program, checker, file);
    if (Object.keys(errorEveryClass).length === 0) {
      return;
    }

    isError = true;

    if (!args.q) {
      console.log(`● ${file}`);
      Object.entries(errorEveryClass).forEach(([className, errors]) => {
        console.log(` ${chalk.gray('class:')} ${chalk.cyanBright(className)}`);
        errors.forEach((err) => console.log(`  ${err}`));
      });
    }
  });

  process.exit(isError ? 2 : 0);
};

const getCompilerOpts = (tsconfigPath: string): ts.CompilerOptions => {
  const absolutePath = path.resolve(tsconfigPath);
  const basePath = path.dirname(absolutePath);

  const configFilePath = ts.findConfigFile(
    basePath,
    ts.sys.fileExists,
    path.basename(absolutePath)
  );

  if (!configFilePath) {
    return {};
  }

  const configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);
  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, basePath).options;
};

type ClassName = string;
type ErrorMessages = string[];
type ErrorEveryClass = Record<ClassName, ErrorMessages>;

const checkFile = (program: ts.Program, checker: ts.TypeChecker, file: string): ErrorEveryClass => {
  const source = program.getSourceFile(file);
  if (!source) {
    return {};
  }

  const errorEveryClass: ErrorEveryClass = {};

  ts.forEachChild(source, (node) => {
    if (!ts.isClassDeclaration(node) || !node.name) {
      return;
    }

    const classType = checker.getTypeAtLocation(node);
    const classSymbol = checker.getSymbolAtLocation(node.name);
    if (!classSymbol) {
      return;
    }

    const errors = checkClassPropertyTypes(checker, classType, classSymbol);
    if (errors.length) {
      errorEveryClass[classSymbol.name] = errors;
    }
  });

  return errorEveryClass;
};

const checkClassPropertyTypes = (
  checker: ts.TypeChecker,
  classType: ts.Type,
  classSymbol: ts.Symbol
): ErrorMessages => {
  const isCheckTarget = isSubClass('TypedJsonMapper', checker, classSymbol.declarations);
  if (!isCheckTarget) {
    return [];
  }

  const errorMessages: ErrorMessages = [];

  classType.getProperties().forEach((property) => {
    if (!ts.isPropertyDeclaration(property.valueDeclaration)) {
      return;
    }

    const propertyType = getTypeString(checker, property);
    const customMapperReturnTypes: string[] = [];
    const useNonNullAssertion = property.valueDeclaration.exclamationToken != null;

    property.getDeclarations()?.forEach((node) => {
      node.decorators?.forEach((decorator) => {
        const isUsingMapDecorator = decorator.expression.getText().includes('map(');
        if (!ts.isCallExpression(decorator.expression) || !isUsingMapDecorator) {
          return;
        }

        decorator.expression.arguments.forEach((decoratorArg) => {
          const decoratorArgType = checker.getSymbolAtLocation(decoratorArg);
          if (!decoratorArgType || !decoratorArgType.declarations[0]) {
            return;
          }

          const decoratorArgCtorType = checker.getTypeOfSymbolAtLocation(
            decoratorArgType,
            decoratorArgType.declarations[0]
          );

          const callSignatures = decoratorArgCtorType.getCallSignatures();
          if (callSignatures.length) {
            // function return type
            customMapperReturnTypes.push(
              ...callSignatures.map((sig) => checker.typeToString(sig.getReturnType()))
            );
          } else {
            // class instance type
            customMapperReturnTypes.push(
              ...decoratorArgCtorType
                .getConstructSignatures()
                .map((sig) => checker.typeToString(sig.getReturnType()))
            );
          }
        });
      });
    });

    const errors = detectErrors(
      property.name,
      propertyType,
      useNonNullAssertion,
      customMapperReturnTypes
    );
    if (errors.length) {
      errorMessages.push(...errors.concat(''));
    }
  });

  return errorMessages;
};

const isSubClass = (className: string, checker: ts.TypeChecker, declarations: ts.Declaration[]) => {
  for (const declaration of declarations) {
    if (!ts.isClassDeclaration(declaration) || !declaration.heritageClauses) {
      continue;
    }

    for (const heritageClause of declaration.heritageClauses) {
      for (const type of heritageClause.types) {
        const heritageClauseType = checker.getTypeAtLocation(type.expression);
        if (
          heritageClauseType.symbol.name === className ||
          isSubClass(className, checker, heritageClauseType.symbol.declarations)
        ) {
          return true;
        }
      }
    }
  }

  return false;
};

const getTypeString = (checker: ts.TypeChecker, symbol: ts.Symbol): string => {
  const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.declarations[0]);
  return checker.typeToString(type);
};

const detectErrors = (
  propertyName: string,
  propertyType: string,
  useNonNullAssertion: boolean,
  customMapperReturnTypes: string[]
): ErrorMessages => {
  if (propertyType === 'undefined') {
    // prettier-ignore
    return [createErrorMessage(propertyName, `can't use only undefined type. use \`null\` instead`)];
  }

  if (useNonNullAssertion) {
    // prettier-ignore
    return [createErrorMessage(propertyName, `can't use Non-null assertion operator. property initialization is required`)];
  }

  if (customMapperReturnTypes.length > 1) {
    // prettier-ignore
    return [createErrorMessage(propertyName, '`@map` decorator is called multiple times. it must be called only once.')];
  }

  const customMapperReturnType = normalizeCustomMapperReturnType(customMapperReturnTypes[0]);

  const isArrayType = propertyType.includes('[]');
  if (isArrayType) {
    if (!customMapperReturnType) {
      return [createErrorMessage(propertyName, '`@map` decorator required if array type property')];
    }

    const unwrapArrayType = propertyType.replace(/[[\]()]/g, '');
    if (unwrapArrayType !== customMapperReturnType) {
      return [
        createErrorMessage(propertyName, 'type mismatch'),
        createSubMessage('property type:', unwrapArrayType),
        createSubMessage('custom mapper type:', customMapperReturnType),
      ];
    }

    return [];
  }

  const isPrimitiveType = ['string', 'number', 'null', 'boolean'].includes(propertyType);
  if (!customMapperReturnType && isPrimitiveType) {
    return [];
  }

  // ---------------
  // custom type or union type
  // ---------------
  if (!customMapperReturnType) {
    return [
      createErrorMessage(propertyName, '`@map` decorator required if union type or custom type'),
    ];
  }

  if (propertyType !== customMapperReturnType) {
    return [
      createErrorMessage(propertyName, 'type mismatch'),
      createSubMessage('property type:', propertyType),
      createSubMessage('custom mapper type:', customMapperReturnType),
    ];
  }

  return [];
};

const normalizeCustomMapperReturnType = (customMapperReturnType: string | undefined) => {
  if (!customMapperReturnType) {
    return customMapperReturnType;
  }

  const isCustomMapperFunction = customMapperReturnType.includes('[');
  if (!isCustomMapperFunction) {
    return customMapperReturnType;
  }

  // custom mapper function return type is [any, Errors]
  return customMapperReturnType
    .replace(/[[\]()]/g, '')
    .split(',')
    .shift();
};

const createErrorMessage = (propertyName: string, message: string) =>
  // prettier-ignore
  `${chalk.redBright('×')} ${chalk.gray('property:')} ${propertyName}  ${chalk.gray('message:')} ${chalk.redBright(message)}`;

const createSubMessage = (label: string, message: string) => `   ${chalk.gray(label)} ${message}`;

if (require.main === module) {
  main();
}

export { getCompilerOpts, checkFile };
