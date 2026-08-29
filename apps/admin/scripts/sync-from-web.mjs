#!/usr/bin/env node
// Sincroniza deps e config shadcn de apps/web para apps/admin
// Uso: node scripts/sync-from-web.mjs
import fs from "fs"
import path from "path"

const root = path.resolve(import.meta.dirname, "../..")
const webPkgPath = path.join(root, "apps/web/package.json")
const adminPkgPath = path.join(root, "apps/admin/package.json")

const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf8"))
const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, "utf8"))

const depsToSync = [
  "tailwindcss", "postcss", "autoprefixer",
  "tailwind-merge", "clsx", "class-variance-authority",
  "lucide-react", "tailwindcss-animate",
  "@radix-ui/react-slot", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-label", "@radix-ui/react-select", "@radix-ui/react-toast",
]

let updated = false
for (const dep of depsToSync) {
  const version = webPkg.dependencies?.[dep] ?? webPkg.devDependencies?.[dep]
  if (!version) continue
  const target = webPkg.dependencies?.[dep] ? "dependencies" : "devDependencies"
  adminPkg[target] ??= {}
  if (adminPkg[target][dep] !== version) {
    console.log(`${dep}: ${adminPkg[target][dep] ?? "(ausente)"} -> ${version}`)
    adminPkg[target][dep] = version
    updated = true
  }
}

if (updated) {
  fs.writeFileSync(adminPkgPath, JSON.stringify(adminPkg, null, 2) + "\n")
  console.log("apps/admin/package.json actualizado. Corre pnpm install")
} else {
  console.log("Nada a sincronizar.")
}

// Copia components.json se diferente
const webComponents = path.join(root, "apps/web/components.json")
const adminComponents = path.join(root, "apps/admin/components.json")
if (fs.existsSync(webComponents)) {
  const web = fs.readFileSync(webComponents, "utf8")
  const admin = fs.existsSync(adminComponents) ? fs.readFileSync(adminComponents, "utf8") : ""
  if (web !== admin) {
    console.log("components.json divergente - copia web -> admin se quiseres alinhar totalmente")
  }
}
