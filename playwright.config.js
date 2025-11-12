import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration
 * E2E тесты для MafClubScore
 */

export default defineConfig({
  testDir: './e2e',

  // Максимальное время на один тест
  timeout: 30 * 1000,

  // Ожидание для expect
  expect: {
    timeout: 5000
  },

  // Повторять упавшие тесты
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,

  // Количество воркеров
  workers: process.env.CI ? 1 : undefined,

  // Репортер
  reporter: process.env.CI ? 'github' : 'list',

  // Общие настройки для всех проектов
  use: {
    // Base URL для тестов
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Скриншоты только при ошибках
    screenshot: 'only-on-failure',

    // Видео только при повторах
    video: 'retain-on-failure',

    // Trace при ошибках
    trace: 'on-first-retry',
  },

  // Конфигурация для разных браузеров
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Для локальной разработки - можно запускать локальный сервер
  webServer: process.env.CI ? undefined : {
    command: 'echo "No dev server needed for file:// tests"',
    timeout: 1000,
    reuseExistingServer: true,
  },
});
