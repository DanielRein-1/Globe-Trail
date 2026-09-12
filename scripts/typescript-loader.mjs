// Used only by maintenance and tests; no dependencies are downloaded.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context);
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    const base = context.parentURL?.startsWith("file:") ? dirname(fileURLToPath(context.parentURL)) : root;
    const local = specifier.startsWith("@/") ? resolve(root, specifier.slice(2))
      : specifier.startsWith(".") ? resolve(base, specifier) : null;
    if (local) {
      if (existsSync(local)) return nextResolve(pathToFileURL(local).href, context);
      for (const extension of [".ts", ".tsx"]) {
        if (existsSync(local + extension)) return nextResolve(pathToFileURL(local + extension).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url) && !url.includes("/node_modules/")) {
      const filename = fileURLToPath(url);
      const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
        fileName: filename,
      });
      return { format: "module", source: outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
