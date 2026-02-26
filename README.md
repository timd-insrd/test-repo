# Appointment Availability Checker

Automated tool to check online appointment availability at
`https://termine.hvlnet.de/m/abh/extern/calendar/` using Playwright browser
automation.

## Setup

```bash
# Install dependencies
npm install

# Install the Chromium browser for Playwright
npm run setup
```

## Usage

### Step 1: Discover available services

Run the discovery script to see what services/links are on the page:

```bash
npm run discover
```

This will list all clickable links and buttons, and save a screenshot to
`screenshots/`. Use the output to identify which services you want to monitor.

### Step 2: Configure services

Edit `src/config.ts` and add your target services:

```ts
services: [
  { name: "My Service", linkText: "Exact or partial link text from Step 1" },
],
```

### Step 3: Check availability

```bash
npm run check
```

### Continuous polling

Set `intervalMinutes` in `src/config.ts` to a value > 0 to poll repeatedly:

```ts
intervalMinutes: 15, // check every 15 minutes
```

Then run `npm run check` — it will keep running and re-checking.

## Configuration

All settings are in `src/config.ts`:

| Setting             | Description                                    | Default |
| ------------------- | ---------------------------------------------- | ------- |
| `baseUrl`           | The appointment calendar URL                   | set     |
| `services`          | Array of services to monitor                   | `[]`    |
| `screenshots`       | Save screenshots to `./screenshots/`           | `true`  |
| `headless`          | Run browser without visible window             | `true`  |
| `navigationTimeout` | Page load timeout in ms                        | 30000   |
| `intervalMinutes`   | Re-check interval (0 = run once)               | 0       |

## Debugging

Set `headless: false` in `src/config.ts` to see the browser in action.
Screenshots are saved to `screenshots/` after each navigation step.
