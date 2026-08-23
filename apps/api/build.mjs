import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const dbPkg = JSON.parse(readFileSync("../../packages/db/package.json", "utf8"));
const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(dbPkg.dependencies ?? {}),
  // pg é transitivo via @workdeal/db — se bundlado causa Dynamic require of "events"
  "pg",
  "pg-native",
  // Node built-ins que pg/dotenv/better-auth fazem require
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
