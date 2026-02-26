import { chromium, Browser, BrowserContext, Page } from "playwright";
import config from "./config";
import * as path from "path";

let screenshotCounter = 0;

export async function launchBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "de-DE",
  });
  context.setDefaultTimeout(config.navigationTimeout);
  const page = await context.newPage();
  return { browser, context, page };
}

export async function takeScreenshot(
  page: Page,
  label: string
): Promise<void> {
  if (!config.screenshots) return;
  screenshotCounter++;
  const filename = `${String(screenshotCounter).padStart(2, "0")}-${label.replace(/[^a-z0-9]/gi, "_")}.png`;
  const filepath = path.join(process.cwd(), "screenshots", filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  [screenshot] ${filename}`);
}
