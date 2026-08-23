import { chromium } from "playwright";
const baseAuth = "http://localhost:4000";
const baseWeb = "http://localhost:3000";

async function createUserAndOrg() {
  const email = `playwright_${Date.now()}@example.com`;
  const password = "Password123!";
  const name = "Playwright Test";
  console.log("Creating user", email);
  let r = await fetch(`${baseAuth}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": baseWeb },
    body: JSON.stringify({ email, password, name }),
  });
  let j = await r.json();
  console.log("signup", r.status);
  let cookie = r.headers.get("set-cookie") || "";
  // create org
  let orgName = `PW Org ${Date.now()}`;
  let slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  let orgRes = await fetch(`${baseAuth}/api/auth/organization/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": baseWeb, "Cookie": cookie },
    body: JSON.stringify({ name: orgName, slug }),
  });
  let orgJ = await orgRes.json();
  console.log("org create", orgRes.status, orgJ.id || orgJ.data?.id);
  return { email, password, orgName, orgId: orgJ.id || orgJ.data?.id, slug };
}

const { email, password, orgName, orgId } = await createUserAndOrg();
console.log("Test creds", email, orgName, orgId);

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext();
const page = await context.newPage();

// Go to login
await page.goto(`${baseWeb}/login`, { waitUntil: "networkidle" });
console.log("Goto login done", page.url());
await page.waitForTimeout(1000);
let content = await page.content();
console.log("Login page snippet", content.slice(0,800));

// Fill form - inspect selectors
// Login form has inputs for email and password, try to find by label/placeholder
try {
  // Try to fill by type
  const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
  await emailInput.waitFor({ timeout: 5000 });
  await emailInput.fill(email);
  console.log("Filled email");
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(password);
  console.log("Filled password");
  // Find submit button
  const submit = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
  await submit.click();
  console.log("Clicked submit");
} catch (e) {
  console.error("Fill error", e);
  await page.screenshot({ path: "C:/tmp/login-error.png" });
  console.log("Saved login-error.png");
}

await page.waitForTimeout(3000);
console.log("After login URL", page.url());
let html = await page.content();
console.log("After login HTML snippet", html.slice(0,2000));

// Wait for dashboard
try {
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
  console.log("Navigated to dashboard", page.url());
} catch (e) {
  console.log("Not yet dashboard, current", page.url());
}

// Check TeamSwitcher
await page.waitForTimeout(2000);
const bodyText = await page.evaluate(() => document.body.innerText);
console.log("Body text snippet", bodyText.slice(0,3000));
if (bodyText.includes(orgName)) console.log("PASS: TeamSwitcher shows orgName");
else console.log("FAIL: orgName not found in body");
if (bodyText.includes("Pessoal")) console.log("Pessoal found");
if (bodyText.includes("(Pessoal)")) console.log("(Pessoal) found");

// Check sidebar links contain orgId
const links = await page.evaluate(() => Array.from(document.querySelectorAll("a")).map(a=>a.href).slice(0,30));
console.log("Links", links.slice(0,20));
const hasOrgLink = links.some(h=> orgId && h.includes(orgId));
console.log("Has org link in sidebar?", hasOrgLink);

// Test Criar empresa dialog
try {
  // Find TeamSwitcher trigger - look for button with ChevronsUpDown
  const teamButton = page.locator('button').filter({ hasText: orgName }).first();
  // Alternative: find sidebar header button
  const trigger = page.locator('[data-sidebar="menu-button"]').first();
  await trigger.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  let dropdownText = await page.evaluate(()=>document.body.innerText);
  console.log("After trigger dropdown", dropdownText.slice(0,2000));
  // Look for Criar empresa
  const criar = page.locator('text=Criar empresa').first();
  if (await criar.count() > 0) {
    console.log("Criar empresa found");
    await criar.click();
    await page.waitForTimeout(800);
    // Fill new org
    const newName = `PW2 ${Date.now()}`;
    const nameInput = page.locator('input[placeholder="Nome da empresa"]').first();
    if (await nameInput.count()>0) {
      await nameInput.fill(newName);
      console.log("Filled newName", newName);
      const createBtn = page.locator('button:has-text("Criar e mudar")').first();
      await createBtn.click();
      await page.waitForTimeout(3000);
      console.log("After create URL", page.url());
      let afterCreateText = await page.evaluate(()=>document.body.innerText);
      console.log("After create body", afterCreateText.slice(0,2000));
      if (afterCreateText.includes(newName) || page.url().includes("/dashboard/")) console.log("PASS Criar empresa flow");
    }
  }
} catch (e) {
  console.error("Criar empresa test error", e);
}

// Screenshot
await page.screenshot({ path: "C:/tmp/dashboard.png", fullPage: true });
console.log("Screenshot saved to C:/tmp/dashboard.png");

// Check FPS / responsiveness by measuring navigation
const start = Date.now();
await page.goto(`${baseWeb}/dashboard`, { waitUntil: "networkidle" });
console.log("Dashboard reload time", Date.now()-start, "ms");

await browser.close();
console.log("Done");
