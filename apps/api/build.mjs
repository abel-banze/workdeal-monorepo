import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  // Node built-ins that dotenv/better-auth may require via `require("fs")`
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
];
// Manter @workdeal/* bundlado (inline) para evitar ERR_MODULE_NOT_FOUND em runtime
const external = externals.filter((d) => !d.startsWith("@workdeal/"));

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
  // bundla @workdeal/* inline; externaliza node_modules para evitar `Dynamic require of "fs"`
  external,
  loader: { ".ts": "ts" },
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  logLevel: "info",
});

console.log("✓ API bundled to dist/index.js");
