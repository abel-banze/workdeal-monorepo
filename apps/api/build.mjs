import { build } from "esbuild";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");

// Resolver que inline @workdeal/* directamente do src (sem precisar de tsc dist)
// Resolve o problema do Vercel com Root Directory = apps/api onde dist/index.js não existe no clone limpo.
const workdealPlugin = {
  name: "workdeal-workspace-resolver",
  setup(build) {
    build.onResolve({ filter: /^@workdeal\// }, (args) => {
      const spec = args.path; // ex: "@workdeal/shared/lib/env" ou "@workdeal/db"
      const parts = spec.split("/");
      // parts[0]="@workdeal", parts[1]=pkg, resto=subpath
      const pkgName = parts[1];
      const subPath = parts.slice(2).join("/");
      let candidate;
      if (!pkgName) return null;
      if (!subPath) {
        candidate = resolve(workspaceRoot, "packages", pkgName, "src", "index.ts");
        if (!existsSync(candidate)) {
          candidate = resolve(workspaceRoot, "packages", pkgName, "src", "index.js");
        }
      } else {
        // tenta src/<subPath>.ts  e  src/<subPath>/index.ts
        candidate = resolve(workspaceRoot, "packages", pkgName, "src", `${subPath}.ts`);
        if (!existsSync(candidate)) {
          candidate = resolve(workspaceRoot, "packages", pkgName, "src", `${subPath}.js`);
        }
        if (!existsSync(candidate)) {
          candidate = resolve(workspaceRoot, "packages", pkgName, "src", subPath, "index.ts");
        }
        if (!existsSync(candidate)) {
          // fallback: subPath já pode ser ficheiro com extensão
          candidate = resolve(workspaceRoot, "packages", pkgName, "src", subPath);
        }
      }
      if (existsSync(candidate)) {
        return { path: candidate };
      }
      // Deixa esbuild tentar resolver via node_modules (vai falhar com mensagem clara se dist não existir)
      // mas loga para debug em Vercel
      console.warn(`[workdeal-resolver] não encontrou ${spec} -> tentou ${candidate}`);
      return null;
    });

    // NodeNext: packages usam `import "./foo.js"` mesmo com ficheiros .ts
    // Mapeia .js relativo para .ts se existir
    build.onResolve({ filter: /^\.\.?\/.*\.js$/ }, (args) => {
      const abs = resolve(args.resolveDir, args.path);
      const ts = abs.replace(/\.js$/, ".ts");
      if (existsSync(ts)) return { path: ts };
      const tsx = abs.replace(/\.js$/, ".tsx");
      if (existsSync(tsx)) return { path: tsx };
      return null;
    });
  },
};

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));
const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  "pg",
  "pg-native",
  "fs",
  "path",
  "os",
  "crypto",
  "stream",
  "util",
  "events",
  "buffer",
  "url",
  "querystring",
  "net",
  "tls",
  "dns",
  "child_process",
].filter((d) => !d.startsWith("@workdeal/"));

// Limpa dist antes para não misturar artefactos tsc + esbuild (ver diagnóstico 404)
rmSync(resolve(__dirname, "dist"), { recursive: true, force: true });

await build({
  entryPoints: [resolve(__dirname, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: resolve(__dirname, "dist"),
  sourcemap: true,
  minify: false,
  resolveExtensions: [".ts", ".js", ".json"],
  external: externals,
  plugins: [workdealPlugin],
  loader: { ".ts": "ts" },
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  logLevel: "info",
});
console.log("✓ API bundled to dist/index.js (inline @workdeal/*)");
