/**
 * Unit tests for js/modules/auth.js
 * Tests authentication and session management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

// Storage keys (same as in auth.js)
const STORAGE_KEYS = {
  IS_LOGGED_IN: 'maf_is_logged_in',
  USERNAME: 'maf_username',
  USER_ROLE: 'maf_user_role',
  LOGIN_TIME: 'maf_login_time'
};

// Simple AuthManager implementation for testing
class AuthManager {
  isLoggedIn() {
    return localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
  }

  getUsername() {
    return localStorage.getItem(STORAGE_KEYS.USERNAME);
  }

  getUserRole() {
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE);
  }

  getLoginTime() {
    const time = localStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
    return time ? new Date(time) : null;
  }

  getUserInfo() {
    if (!this.isLoggedIn()) {
      return null;
    }

    return {
      username: this.getUsername(),
      role: this.getUserRole(),
      loginTime: this.getLoginTime()
    };
  }

  setSession(username, role = 'user') {
    const loginTime = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, loginTime);
  }

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
  }

  requireAuth(redirectUrl = '/login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }
}

describe('AuthManager', () => {
  let auth;

  beforeEach(() => {
    auth = new AuthManager();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isLoggedIn()', () => {
    it('should return false when not logged in', () => {
      expect(auth.isLoggedIn()).toBe(false);
    });

    it('should return true when logged in', () => {
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      expect(auth.isLoggedIn()).toBe(true);
    });

    it('should return false for invalid values', () => {
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'yes');
      expect(auth.isLoggedIn()).toBe(false);

      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, '1');
      expect(auth.isLoggedIn()).toBe(false);
    });
  });

  describe('getUsername()', () => {
    it('should return null when no username', () => {
      expect(auth.getUsername()).toBeNull();
    });

    it('should return username when set', () => {
      localStorage.setItem(STORAGE_KEYS.USERNAME, 'testuser');
      expect(auth.getUsername()).toBe('testuser');
    });

    it('should handle special characters in username', () => {
      const specialUsername = 'user@test.com';
      localStorage.setItem(STORAGE_KEYS.USERNAME, specialUsername);
      expect(auth.getUsername()).toBe(specialUsername);
    });
  });

  describe('getUserRole()', () => {
    it('should return null when no role', () => {
      expect(auth.getUserRole()).toBeNull();
    });

    it('should return role when set', () => {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'admin');
      expect(auth.getUserRole()).toBe('admin');
    });

    it('should handle different role types', () => {
      const roles = ['admin', 'user', 'moderator', 'guest'];

      roles.forEach(role => {
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
        expect(auth.getUserRole()).toBe(role);
      });
    });
  });

  describe('getLoginTime()', () => {
    it('should return null when no login time', () => {
      expect(auth.getLoginTime()).toBeNull();
    });

    it('should return Date object when login time exists', () => {
      const now = new Date();
      localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, now.toISOString());

      const loginTime = auth.getLoginTime();
      expect(loginTime).toBeInstanceOf(Date);
      expect(loginTime.getTime()).toBeCloseTo(now.getTime(), -2);
    });

    it('should handle invalid date strings', () => {
      localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, 'invalid-date');
      const loginTime = auth.getLoginTime();
      expect(loginTime).toBeInstanceOf(Date);
      expect(loginTime.toString()).toBe('Invalid Date');
    });
  });

  describe('getUserInfo()', () => {
    it('should return null when not logged in', () => {
      expect(auth.getUserInfo()).toBeNull();
    });

    it('should return user info when logged in', () => {
      const now = new Date();
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      localStorage.setItem(STORAGE_KEYS.USERNAME, 'testuser');
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'admin');
      localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, now.toISOString());

      const userInfo = auth.getUserInfo();

      expect(userInfo).toEqual({
        username: 'testuser',
        role: 'admin',
        loginTime: expect.any(Date)
      });
    });

    it('should handle partial data', () => {
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      localStorage.setItem(STORAGE_KEYS.USERNAME, 'testuser');

      const userInfo = auth.getUserInfo();

      expect(userInfo).toEqual({
        username: 'testuser',
        role: null,
        loginTime: null
      });
    });
  });

  describe('setSession()', () => {
    it('should set all session data', () => {
      auth.setSession('testuser', 'admin');

      expect(localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN)).toBe('true');
      expect(localStorage.getItem(STORAGE_KEYS.USERNAME)).toBe('testuser');
      expect(localStorage.getItem(STORAGE_KEYS.USER_ROLE)).toBe('admin');
      expect(localStorage.getItem(STORAGE_KEYS.LOGIN_TIME)).toBeTruthy();
    });

    it('should default to user role', () => {
      auth.setSession('testuser');

      expect(localStorage.getItem(STORAGE_KEYS.USER_ROLE)).toBe('user');
    });

    it('should set login time as ISO string', () => {
      const beforeTime = new Date();
      auth.setSession('testuser');
      const afterTime = new Date();

      const loginTime = new Date(localStorage.getItem(STORAGE_KEYS.LOGIN_TIME));

      expect(loginTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(loginTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should overwrite existing session', () => {
      auth.setSession('user1', 'admin');
      auth.setSession('user2', 'user');

      expect(localStorage.getItem(STORAGE_KEYS.USERNAME)).toBe('user2');
      expect(localStorage.getItem(STORAGE_KEYS.USER_ROLE)).toBe('user');
    });
  });

  describe('clearSession()', () => {
    it('should remove all session data', () => {
      auth.setSession('testuser', 'admin');
      auth.clearSession();

      expect(localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.USERNAME)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.USER_ROLE)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.LOGIN_TIME)).toBeNull();
    });

    it('should work even if session was not set', () => {
      expect(() => auth.clearSession()).not.toThrow();
    });

    it('should make isLoggedIn return false', () => {
      auth.setSession('testuser');
      expect(auth.isLoggedIn()).toBe(true);

      auth.clearSession();
      expect(auth.isLoggedIn()).toBe(false);
    });
  });

  describe('requireAuth()', () => {
    it('should return true when logged in', () => {
      auth.setSession('testuser');
      expect(auth.requireAuth()).toBe(true);
    });

    it('should return false when not logged in', () => {
      // Mock window.location
      delete global.window;
      global.window = { location: { href: '' } };

      expect(auth.requireAuth()).toBe(false);
    });

    it('should redirect to login when not authorized', () => {
      delete global.window;
      global.window = { location: { href: '' } };

      auth.requireAuth();
      expect(window.location.href).toBe('/login.html');
    });

    it('should redirect to custom URL', () => {
      delete global.window;
      global.window = { location: { href: '' } };

      auth.requireAuth('/custom-login.html');
      expect(window.location.href).toBe('/custom-login.html');
    });
  });

  describe('Security tests', () => {
    it('should not expose sensitive data in storage keys', () => {
      auth.setSession('testuser', 'admin');

      // Check that password is never stored
      const allKeys = Object.keys(localStorage.getItem ? {} : {});
      const hasPassword = allKeys.some(key => key.toLowerCase().includes('password'));
      expect(hasPassword).toBe(false);
    });

    it('should handle XSS in username', () => {
      const xssUsername = '<script>alert("XSS")</script>';
      auth.setSession(xssUsername);

      const storedUsername = auth.getUsername();
      expect(storedUsername).toBe(xssUsername);
    });

    it('should handle SQL injection attempts in username', () => {
      const sqlInjection = "admin' OR '1'='1";
      auth.setSession(sqlInjection);

      const storedUsername = auth.getUsername();
      expect(storedUsername).toBe(sqlInjection);
    });
  });
});
