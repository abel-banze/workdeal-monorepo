import { runSync } from "./sync.js";

runSync()
  .then((result) => {
    console.log(`[scraper] sync OK — total=${result.total} novos=${result.newCount}`);
  })
  .catch((error) => {
    console.error("Erro fatal no scraper:", error);
    process.exitCode = 1;
  });