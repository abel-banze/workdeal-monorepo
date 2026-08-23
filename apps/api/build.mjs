import { build } from "esbuild";
import { readFileSync, rmSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
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
rmSync("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: "dist",
  sourcemap: true,
  minify: false,
  resolveExtensions: [".ts", ".js", ".json"],
  external: externals,
  loader: { ".ts": "ts" },
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  logLevel: "info",
});
console.log("✓ API bundled to dist/index.js (inline @workdeal/*)");
