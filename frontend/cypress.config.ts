import { plugin as cypressGrepPlugin } from "@cypress/grep/plugin";
import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    devServer: {
      bundler: "webpack",
      framework: "next",
    },
    projectId: "ctn3tt",
    setupNodeEvents(_, config) {
      if (config.isTextTerminal) {
        cypressGrepPlugin(config);
      }
      return config;
    },
    specPattern: ["components/**/*.test.tsx", "packages/**/*.test.tsx"],
    supportFile: "cypress/support/component.tsx",
  },

  e2e: {
    baseUrl: "http://localhost",
    numTestsKeptInMemory: 0, // Default is 50; set to 0 for large forms
    projectId: "shdtfb",
    setupNodeEvents(on, config) {
      if (config.isTextTerminal) {
        cypressGrepPlugin(config);
      }

      // try to avoid crashes in vflz/data.spec.js by increasing memory limit and exposing gc function
      on("before:browser:launch", (browser, launchOptions) => {
        // Apply only to Chromium-based browsers (Chrome, Edge, Chromium)
        if (browser.name === "chrome" || browser.family === "chromium") {
          // Increase V8 heap size to 4GB (4096MB) or 8GB (8192MB)
          launchOptions.args.push("--js-flags=--max-old-space-size=4096");

          // Forces V8 to expose garbage collection globally if you want to manually trigger it
          launchOptions.args.push("--js-flags=--expose-gc");

          // Disable headless throttling that causes freeze-ups
          launchOptions.args.push(
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-dev-shm-usage",
          );
        }

        return launchOptions;
      });
      return config;
    },
    specPattern: "cypress/e2e/**/*.ts",
    viewportHeight: 768,
    viewportWidth: 1024,
  },
  retries: {
    openMode: 0, // avoid crashes in vflz/data.spec.js
    runMode: 2,
  },
});
