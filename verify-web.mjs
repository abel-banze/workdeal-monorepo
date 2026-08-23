const baseAuth = "http://localhost:4000";
const baseWeb = "http://localhost:3000";
let email = `verify_${Date.now()}@example.com`;
let password = "Password123!";
let name = "VerifyUser";
console.log("Signup", email);
let r = await fetch(`${baseAuth}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000" },
  body: JSON.stringify({ email, password, name }),
});
let j = await r.json();
console.log("signup", r.status, j);
let cookie = r.headers.get("set-cookie") || "";
console.log("cookie", cookie.slice(0,150));

// Create org
let orgName = `VerifyOrg ${Date.now()}`;
let slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g,"-");
let orgRes = await fetch(`${baseAuth}/api/auth/organization/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Cookie": cookie },
  body: JSON.stringify({ name: orgName, slug }),
});
let orgJ = await orgRes.json();
console.log("org create", orgRes.status, orgJ);
let orgId = orgJ.id || orgJ.data?.id;

// Get JWT
let tokenRes = await fetch(`${baseAuth}/api/auth/token`, {
  headers: { "Cookie": cookie, "Origin": "http://localhost:3000" },
});
let tokenJ = await tokenRes.json();
console.log("token", tokenJ);
let jwt = tokenJ.token;
if (!jwt) { console.error("no jwt"); process.exit(1); }

// Fetch dashboard with JWT cookie
let dashRes = await fetch(`${baseWeb}/dashboard`, {
  headers: { "Cookie": `workdeal_jwt=${jwt}` },
  redirect: "manual",
});
console.log("dashboard status", dashRes.status, dashRes.headers.get("location"));
let html = await dashRes.text();
console.log("html snippet", html.slice(0, 3000));
// Check for team names
if (html.includes(orgName)) console.log("PASS: org name found in dashboard HTML");
else console.log("FAIL: org name NOT found");
if (html.includes("Pessoal") || html.includes("(Pessoal)")) console.log("Pessoal found");
if (html.includes("workdeal_jwt") || html.includes("TeamSwitcher")) console.log("TeamSwitcher marker");

// Also fetch org dashboard
let orgDashRes = await fetch(`${baseWeb}/dashboard/${orgId}`, {
  headers: { "Cookie": `workdeal_jwt=${jwt}` },
  redirect: "manual",
});
console.log("org dashboard status", orgDashRes.status);
let orgHtml = await orgDashRes.text();
console.log("org html snippet", orgHtml.slice(0,3000));
if (orgHtml.includes(orgName)) console.log("PASS org dashboard contains name");
