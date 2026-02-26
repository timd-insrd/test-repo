/**
 * Appointment availability checker.
 *
 * Navigates to the calendar page, clicks on each configured service,
 * and inspects the resulting page for available appointment slots.
 *
 * Usage: npm run check
 */
import { Page } from "playwright";
import config, { ServiceConfig } from "./config";
import { launchBrowser, takeScreenshot } from "./browser";

interface SlotInfo {
  service: string;
  available: boolean;
  details: string[];
  url: string;
}

/**
 * After clicking a service link, analyse the resulting page for availability.
 */
async function analyseAvailability(
  page: Page,
  service: ServiceConfig
): Promise<SlotInfo> {
  const result: SlotInfo = {
    service: service.name,
    available: false,
    details: [],
    url: page.url(),
  };

  // Wait for the page to settle after navigation
  await page.waitForLoadState("networkidle").catch(() => {});

  const bodyText = (await page.textContent("body")) || "";
  const lowerBody = bodyText.toLowerCase();

  // Common German phrases indicating NO availability
  const noAvailPhrases = [
    "kein termin",
    "keine termine",
    "leider keine",
    "nicht verfügbar",
    "ausgebucht",
    "no available",
    "no appointment",
    "fully booked",
    "currently no",
  ];

  const hasNoAvail = noAvailPhrases.some((phrase) =>
    lowerBody.includes(phrase)
  );

  // Look for positive indicators — clickable date cells, time slots, etc.
  const dateSlots = await page.$$([
    "td.available",
    "td.free",
    ".timeslot",
    ".time-slot",
    ".slot.available",
    ".calendar-day.available",
    'td:not(.disabled):not(.past) a[href*="calendar"]',
    ".buchbar",
    ".day-free",
    "a.appointment",
  ].join(", ")).catch(() => []);

  // Also check for any clickable date links within a calendar table
  const calendarLinks = await page.$$eval(
    "table td a, .calendar a, .day a",
    (anchors) =>
      anchors
        .map((a) => ({
          text: (a.textContent || "").trim(),
          href: a.getAttribute("href") || "",
        }))
        .filter((l) => l.text.length > 0 && /\d/.test(l.text))
  ).catch(() => []);

  if (dateSlots.length > 0) {
    result.available = true;
    result.details.push(`Found ${dateSlots.length} available slot element(s)`);
  }

  if (calendarLinks.length > 0) {
    result.available = true;
    result.details.push(
      `Found ${calendarLinks.length} calendar date link(s): ${calendarLinks
        .slice(0, 5)
        .map((l) => l.text)
        .join(", ")}${calendarLinks.length > 5 ? "..." : ""}`
    );
  }

  if (hasNoAvail && !result.available) {
    result.available = false;
    result.details.push("Page contains 'no availability' message");
  }

  // If we couldn't determine either way, flag it for review
  if (result.details.length === 0) {
    result.details.push(
      "Could not auto-detect availability — check the screenshot"
    );
    // Include a snippet of the page text for manual review
    const snippet = bodyText.replace(/\s+/g, " ").trim().slice(0, 300);
    result.details.push(`Page text preview: "${snippet}"`);
  }

  return result;
}

async function checkServices() {
  if (config.services.length === 0) {
    console.error(
      "No services configured. Run `npm run discover` first, then add services to src/config.ts."
    );
    process.exit(1);
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log("  Appointment Availability Checker");
  console.log(`${"═".repeat(70)}`);
  console.log(`  URL: ${config.baseUrl}`);
  console.log(`  Services to check: ${config.services.length}`);
  console.log(`  Time: ${new Date().toLocaleString("de-DE")}\n`);

  const { browser, page } = await launchBrowser();
  const results: SlotInfo[] = [];

  try {
    for (const service of config.services) {
      console.log(`\n─ Checking: ${service.name}`);
      console.log(`  Looking for link: "${service.linkText}"`);

      // Navigate to the base page for each service
      await page.goto(config.baseUrl, { waitUntil: "networkidle" });
      await takeScreenshot(page, `before-${service.name}`);

      // Try to find and click the matching link/button
      let clicked = false;

      // Strategy 1: Match by visible text (link)
      const linkByText = page.getByRole("link", {
        name: service.linkText,
      });
      if ((await linkByText.count()) > 0) {
        await linkByText.first().click();
        clicked = true;
      }

      // Strategy 2: Match by button text
      if (!clicked) {
        const btnByText = page.getByRole("button", {
          name: service.linkText,
        });
        if ((await btnByText.count()) > 0) {
          await btnByText.first().click();
          clicked = true;
        }
      }

      // Strategy 3: Match by text content anywhere clickable
      if (!clicked) {
        const byText = page.getByText(service.linkText, { exact: false });
        if ((await byText.count()) > 0) {
          await byText.first().click();
          clicked = true;
        }
      }

      // Strategy 4: Try as a CSS selector
      if (!clicked) {
        try {
          await page.click(service.linkText, { timeout: 5000 });
          clicked = true;
        } catch {
          // not a valid selector or not found
        }
      }

      if (!clicked) {
        console.log(`  ⚠ Could not find link/button for "${service.linkText}"`);
        results.push({
          service: service.name,
          available: false,
          details: [`Link not found: "${service.linkText}"`],
          url: page.url(),
        });
        continue;
      }

      // Wait for navigation after click
      await page.waitForLoadState("networkidle").catch(() => {});
      await takeScreenshot(page, `after-${service.name}`);

      const result = await analyseAvailability(page, service);
      results.push(result);

      if (result.available) {
        console.log(`  ✅ AVAILABLE!`);
      } else {
        console.log(`  ❌ No availability detected`);
      }
      for (const detail of result.details) {
        console.log(`     ${detail}`);
      }
    }

    // Print summary
    console.log(`\n${"═".repeat(70)}`);
    console.log("  SUMMARY");
    console.log(`${"═".repeat(70)}`);

    const available = results.filter((r) => r.available);
    const unavailable = results.filter((r) => !r.available);

    if (available.length > 0) {
      console.log(`\n  ✅ Available (${available.length}):`);
      for (const r of available) {
        console.log(`     • ${r.service} — ${r.url}`);
        for (const d of r.details) console.log(`       ${d}`);
      }
    }

    if (unavailable.length > 0) {
      console.log(`\n  ❌ Not available (${unavailable.length}):`);
      for (const r of unavailable) {
        console.log(`     • ${r.service}`);
        for (const d of r.details) console.log(`       ${d}`);
      }
    }

    console.log(`\n${"═".repeat(70)}\n`);
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const runOnce = async () => {
    const results = await checkServices();
    return results.some((r) => r.available);
  };

  if (config.intervalMinutes <= 0) {
    await runOnce();
  } else {
    console.log(
      `Polling every ${config.intervalMinutes} minute(s). Press Ctrl+C to stop.\n`
    );
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const found = await runOnce();
      if (found) {
        console.log("\n🔔 Appointments found! Check above for details.\n");
      }
      console.log(
        `\nNext check in ${config.intervalMinutes} minute(s)...\n`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMinutes * 60_000)
      );
    }
  }
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
