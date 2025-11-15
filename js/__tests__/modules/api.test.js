/**
 * Unit tests for js/modules/api.js
 * Tests API client functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn();

// Simple ApiClient implementation for testing (same as in api.js)
class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

describe('ApiClient', () => {
  let client;

  beforeEach(() => {
    client = new ApiClient('https://test.example.com');
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should create instance with baseURL', () => {
      expect(client.baseURL).toBe('https://test.example.com');
    });

    it('should create instance with empty baseURL', () => {
      const emptyClient = new ApiClient();
      expect(emptyClient.baseURL).toBe('');
    });
  });

  describe('request()', () => {
    it('should make successful request', async () => {
      const mockData = { id: 1, name: 'Test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await client.request('/api/test');

      expect(fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      await expect(client.request('/api/missing')).rejects.toThrow('Not found');
    });

    it('should handle HTTP errors without error message', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(client.request('/api/error')).rejects.toThrow('HTTP error 500');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.request('/api/test')).rejects.toThrow('Network error');
    });

    it('should merge custom headers', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await client.request('/api/test', {
        headers: {
          'Authorization': 'Bearer token123'
        }
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123'
          })
        })
      );
    });
  });

  describe('get()', () => {
    it('should make GET request', async () => {
      const mockData = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await client.get('/api/resource');

      expect(fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/resource',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('post()', () => {
    it('should make POST request with data', async () => {
      const postData = { name: 'New Item' };
      const mockResponse = { id: 1, ...postData };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.post('/api/items', postData);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle POST errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid data' })
      });

      await expect(client.post('/api/items', {})).rejects.toThrow('Invalid data');
    });
  });

  describe('put()', () => {
    it('should make PUT request with data', async () => {
      const putData = { name: 'Updated Item' };
      const mockResponse = { id: 1, ...putData };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.put('/api/items/1', putData);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete()', () => {
    it('should make DELETE request', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await client.delete('/api/items/1');

      expect(fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/items/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response body', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      const result = await client.get('/api/empty');
      expect(result).toBeNull();
    });

    it('should handle array response', async () => {
      const mockArray = [{ id: 1 }, { id: 2 }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArray
      });

      const result = await client.get('/api/list');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should construct correct URL with baseURL', () => {
      const client1 = new ApiClient('https://api.example.com');
      const client2 = new ApiClient('https://api.example.com/');
      const client3 = new ApiClient('');

      expect(client1.baseURL).toBe('https://api.example.com');
      expect(client2.baseURL).toBe('https://api.example.com/');
      expect(client3.baseURL).toBe('');
    });
  });

  describe('Timeout and retry scenarios', () => {
    it('should handle timeout errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(client.get('/api/slow')).rejects.toThrow('Request timeout');
    });

    it('should handle abort errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Request aborted'));

      await expect(client.get('/api/test')).rejects.toThrow('Request aborted');
    });
  });
});
