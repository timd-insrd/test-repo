export interface ServiceConfig {
  /** Display name for logging */
  name: string;
  /**
   * How to identify the link on the service selection page.
   * Can be the visible link text (or a substring) or a CSS selector.
   */
  linkText: string;
}

export interface AppConfig {
  /** Base URL of the appointment calendar */
  baseUrl: string;

  /** Services to check — leave empty to discover all services */
  services: ServiceConfig[];

  /** Take a screenshot of every page visited (saved to ./screenshots/) */
  screenshots: boolean;

  /** Run the browser in visible mode (useful for debugging) */
  headless: boolean;

  /** Timeout in ms for page navigation */
  navigationTimeout: number;

  /** How often to re-check, in minutes (0 = run once) */
  intervalMinutes: number;
}

const config: AppConfig = {
  baseUrl: "https://termine.hvlnet.de/m/abh/extern/calendar/",

  // Specify the services you want to monitor.
  // First run `npm run discover` to see what services are listed,
  // then fill in the names here.
  services: [
    // Example:
    // { name: "Passport Application", linkText: "Reisepass beantragen" },
    // { name: "ID Card", linkText: "Personalausweis" },
  ],

  screenshots: true,
  headless: true,
  navigationTimeout: 30_000,
  intervalMinutes: 0, // 0 = run once; set to e.g. 15 to poll every 15 min
};

export default config;
