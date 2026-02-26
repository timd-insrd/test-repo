/**
 * Discovery script — navigates to the appointment page and lists
 * all available services / clickable links so you can configure
 * which ones to monitor.
 *
 * Usage: npm run discover
 */
import config from "./config";
import { launchBrowser, takeScreenshot } from "./browser";

async function discover() {
  console.log(`\nNavigating to: ${config.baseUrl}\n`);

  const { browser, page } = await launchBrowser();

  try {
    await page.goto(config.baseUrl, { waitUntil: "networkidle" });
    await takeScreenshot(page, "service-selection-page");

    // Grab the page title
    const title = await page.title();
    console.log(`Page title: ${title}\n`);

    // Collect all links on the page
    const links = await page.$$eval("a", (anchors) =>
      anchors
        .map((a) => ({
          text: (a.textContent || "").trim(),
          href: a.getAttribute("href") || "",
        }))
        .filter((l) => l.text.length > 0)
    );

    if (links.length === 0) {
      console.log("No links found on the page.");
      console.log("\nPage content (first 2000 chars):");
      const content = await page.textContent("body");
      console.log(content?.slice(0, 2000));
    } else {
      console.log(`Found ${links.length} link(s):\n`);
      console.log("─".repeat(70));
      for (const link of links) {
        console.log(`  Text: "${link.text}"`);
        console.log(`  Href: ${link.href}`);
        console.log("─".repeat(70));
      }
    }

    // Also list any buttons, as the site might use <button> elements
    const buttons = await page.$$eval("button", (btns) =>
      btns
        .map((b) => ({
          text: (b.textContent || "").trim(),
          type: b.getAttribute("type") || "",
        }))
        .filter((b) => b.text.length > 0)
    );

    if (buttons.length > 0) {
      console.log(`\nFound ${buttons.length} button(s):\n`);
      console.log("─".repeat(70));
      for (const btn of buttons) {
        console.log(`  Text: "${btn.text}"`);
        console.log(`  Type: ${btn.type}`);
        console.log("─".repeat(70));
      }
    }

    // List any clickable list items or divs that look like service entries
    const clickableItems = await page.$$eval(
      '[role="button"], [onclick], .calendar-service, li > a, .service-item, .list-group-item',
      (els) =>
        els
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 120),
            classes: el.className,
          }))
          .filter((e) => e.text.length > 0)
    );

    if (clickableItems.length > 0) {
      console.log(`\nFound ${clickableItems.length} clickable item(s):\n`);
      console.log("─".repeat(70));
      for (const item of clickableItems) {
        console.log(`  <${item.tag}> "${item.text}"`);
        if (item.classes) console.log(`  Classes: ${item.classes}`);
        console.log("─".repeat(70));
      }
    }

    console.log("\nDone! Check the screenshots/ folder for a visual snapshot.");
    console.log(
      "Copy the service names you want to monitor into src/config.ts.\n"
    );
  } finally {
    await browser.close();
  }
}

discover().catch((err) => {
  console.error("Discovery failed:", err);
  process.exit(1);
});
