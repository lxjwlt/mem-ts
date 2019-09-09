const ts = require("typescript");

const REG = {
  js: /\.js$/,
  tsd: /\.d.ts$/,
  ts: /\.ts$/
};

function createCompilerHost({store, onWriteFile}, ...args) {
  let host = ts.createCompilerHost(...args);

  function fileExists(fileName) {
    if (store.sourceFileMap[fileName]) {
      return true;
    } else {
      return ts.sys.fileExists(fileName);
    }
  }

  function readFile(fileName) {
    if (store.sourceFileMap[fileName]) {
      return store.sourceFileMap[fileName];
    } else {
      return ts.sys.readFile(fileName);
    }
  }

  function writeFile(fileName, data) {

    if (onWriteFile) {
      if (onWriteFile(store, fileName, data)) {
        return;
      }
    }

    if (REG.js.test(fileName)) {
      let id = store.idMap[fileName.replace(REG.js, ".ts")];

      if (id) {
        fileName = id;
      }

      store.jsFileMap[fileName] = data;
      return;
    }

    if (REG.tsd.test(fileName)) {
      let id = store.idMap[fileName.replace(REG.tsd, ".ts")];

      if (id) {
        fileName = id;
      }

      store.tsDeclarationMap[fileName] = data;
      return;
    }

    host.writeFile(...arguments);
  }

  function getSourceFile(fileName, languageVersion) {
    const sourceText = readFile(fileName);

    return sourceText !== undefined ?
      ts.createSourceFile(fileName, sourceText, languageVersion) : undefined;
  }

  return {
    ...host,
    fileExists,
    readFile,
    getSourceFile,
    writeFile
  };
}

function compile(sourceFileMap, options = {}) {
  let {compilerOptions, onWriteFile} = options;

  let store = {
    sourceFileMap: {},
    jsFileMap: {},
    tsDeclarationMap: {},
    idMap: {}
  };

  Object.keys(sourceFileMap).forEach(key => {
    let newKey = key;

    /**
     * windows
     */
    newKey = key.replace(/\\+/g, "/");

    if (!REG.ts.test(newKey)) {
      newKey = newKey + ".ts";
      store.idMap[newKey] = key;
    }

    store.idMap[newKey] = key;

    store.sourceFileMap[newKey] = sourceFileMap[key];
  });

  compilerOptions = {
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    ...compilerOptions
  };

  let host = createCompilerHost({
    store,
    onWriteFile
  }, compilerOptions);

  let program = ts.createProgram(Object.keys(store.sourceFileMap), compilerOptions, host);

  let emitResult = program.emit();

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  let errList = [];

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let {line, character} = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );

      errList.push(
        `${store.idMap[diagnostic.file.fileName] || diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      errList.push(
        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
      );
    }
  });

  return {
    error: errList.length ? new Error(errList.join("\n")) : null,
    emitResult,
    jsFileMap: store.jsFileMap,
    tsDeclarationMap: store.tsDeclarationMap
  };
}

module.exports = {
  compile
};
