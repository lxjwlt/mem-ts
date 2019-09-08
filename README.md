# mem-ts

install:

```
npm install "mem-ts"
```

usage:

```javascript
import memTS from "mem-ts";
let {tsDeclarationMap} = memTS.compile({
  "./test.js": `var a:number = 1`
}, {
  compilerOptions: {
    moduleResolution: ts.ModuleResolutionKind.Node,
    esModuleInterop: true,
    allowJs: false,
    allowUnreachableCode: true,
    allowUnusedLabels: true,
    noStrictGenericChecks: true,
    skipLibCheck: true
  }
});

tsDeclarationMap["./test.js"] = "var a = 1;";
```
