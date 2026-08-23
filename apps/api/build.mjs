import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: "dist",
  // keep source maps for Vercel logs
  sourcemap: true,
  // minify a bit but keep readable for debugging
  minify: false,
  // handle .ts imports with .js extension (NodeNext style)
  resolveExtensions: [".ts", ".js", ".json"],
  // bundle workspace packages (@workdeal/*) inline; keep native / optional externals
  packages: "bundle",
  // mark node built-ins as external automatically (platform=node does)
  // explicitly externalize pg-native which is optional and breaks esbuild
  external: ["pg-native", "cloudinary"],
  loader: { ".ts": "ts" },
  // needed for Hono JSX if any
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  // define NODE_ENV for dead-code elimination
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  logLevel: "info",
});

console.log("✓ API bundled to dist/index.js");
