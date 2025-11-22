import { test, expect } from '@playwright/test';

/**
 * CRITICAL E2E TEST: Login Page
 * Phase 0.2: Критические E2E тесты
 *
 * Тестирует авторизацию операторов
 */

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Login Page @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login.html`);
  });

  test('should load login page correctly', async ({ page }) => {
    // Проверяем что страница загрузилась
    await page.waitForSelector('.login-container', { timeout: 5000 });

    // Проверяем наличие формы
    await expect(page.locator('#loginForm')).toBeVisible();

    // Проверяем наличие полей ввода
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Проверяем наличие кнопки входа
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation for empty fields', async ({ page }) => {
    // Попытка отправить пустую форму
    await page.click('button[type="submit"]');

    // Браузер должен показать валидацию (required атрибуты)
    const usernameInput = page.locator('#username');
    const isRequired = await usernameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('should have required fields', async ({ page }) => {
    // Проверяем что поля обязательные
    const usernameRequired = await page.locator('#username').getAttribute('required');
    const passwordRequired = await page.locator('#password').getAttribute('required');

    expect(usernameRequired).not.toBeNull();
    expect(passwordRequired).not.toBeNull();
  });

  test('should have back link to main page', async ({ page }) => {
    // Проверяем наличие ссылки "Назад"
    const backLink = page.locator('a.back-link');
    await expect(backLink).toBeVisible();

    // Проверяем что ссылка ведёт на главную
    const href = await backLink.getAttribute('href');
    expect(href).toContain('rating.html');
  });

  test('should have password field with type="password"', async ({ page }) => {
    const passwordInput = page.locator('#password');
    const type = await passwordInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('should have autofocus on username field', async ({ page }) => {
    // Проверяем что у поля username есть autofocus
    const usernameInput = page.locator('#username');
    const hasAutofocus = await usernameInput.getAttribute('autofocus');
    expect(hasAutofocus).not.toBeNull();
  });

  test('should login successfully with any credentials (legacy system)', async ({ page }) => {
    // В текущей реализации используется legacy система авторизации
    // которая принимает любой логин/пароль (FEATURE_NEW_AUTH_SYSTEM = false)

    // Заполняем форму
    await page.fill('#username', 'admin');
    await page.fill('#password', 'any_password');

    // Отправляем форму
    await page.click('button[type="submit"]');

    // Проверяем что произошёл редирект на game-input.html
    await page.waitForURL('**/game-input.html', { timeout: 5000 });
    expect(page.url()).toContain('game-input.html');

    // Проверяем что в localStorage сохранились данные авторизации
    const isLoggedIn = await page.evaluate(() => localStorage.getItem('maf_is_logged_in'));
    const username = await page.evaluate(() => localStorage.getItem('maf_username'));

    expect(isLoggedIn).toBe('true');
    expect(username).toBe('admin');
  });

  test('should show error for empty fields', async ({ page }) => {
    // Оставляем поля пустыми
    await page.fill('#username', '');
    await page.fill('#password', '');

    // Пытаемся отправить форму (но браузер заблокирует из-за required)
    const usernameInput = page.locator('#username');
    const isRequired = await usernameInput.getAttribute('required');

    // Проверяем что поля действительно обязательные
    expect(isRequired).not.toBeNull();
  });
});
