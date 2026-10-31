import { defineConfig, devices } from "@playwright/test";

// Rodar sempre com --workers=4 (já está no script test:ui).
export default defineConfig({
  testDir: "tests/ui",
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8791/",
    timezoneId: "America/Sao_Paulo",
    locale: "pt-BR",
    serviceWorkers: "block"
  },
  webServer: {
    command: "python3 -m http.server 8791 --bind 127.0.0.1 --directory docs",
    url: "http://127.0.0.1:8791/",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "ignore"
  },
  // WebKit não abre nesta máquina; o Firefox cobre o segundo motor.
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "celular-chromium", use: { ...devices["Pixel 5"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } }
  ]
});
