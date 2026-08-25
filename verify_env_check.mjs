import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { z } = require("zod");
console.log("zod", require("zod/package.json").version);
const envSchema = z.object({
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  API_URL: z.string().url().default("http://localhost:4000"),
});
function test(label, vars) {
  const p = envSchema.parse(vars);
  const base = p.API_URL.replace(/\/+$/, "");
  const url = `${base}/api/v1/places/autocomplete?input=codeba`;
  console.log(`✅ ${label}: API_URL=${p.API_URL} => base=${base} => ${url} ${base.includes("vercel.app") ? "❌ VERCEL" : "✅ OK"}`);
}
test("default", {});
test("sandbox", { API_URL: "https://sandbox-api.workdeal.co.mz" });
test("sandbox slash", { API_URL: "https://sandbox-api.workdeal.co.mz/" });
test("prod", { API_URL: "https://api.workdeal.co.mz" });
test("localhost", { API_URL: "http://localhost:4000" });
console.log("normalization: https://api.workdeal.co.mz/// =>", "https://api.workdeal.co.mz///".replace(/\/+$/,""));
function build(path, base){ return `${base.replace(/\/+$/,"")}${path}`; }
console.log("build sandbox:", build("/api/v1/places/autocomplete?input=codeba", "https://sandbox-api.workdeal.co.mz"));
console.log("OLD would be https://workdeal-monorepo-kmwzr7ozg-abelbanzes-projects.vercel.app/api/v1/places/autocomplete?input=codeba => 401");
