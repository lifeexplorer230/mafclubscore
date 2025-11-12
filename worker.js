// Main Worker для Cloudflare Workers Sites
// Обрабатывает все запросы: API + статические файлы

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// ==================== AUTH API ====================

const VALID_CREDENTIALS = {
  username: 'Egor',
  password: 'unnatov14'
};

async function handleLogin(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await request.json();

    if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
      const token = crypto.randomUUID() + '-' + Date.now();
      return new Response(JSON.stringify({
        success: true,
        token: token,
        username: username,
        expiresIn: '7 days'
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Неверный логин или пароль'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка авторизации',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

async function handleVerify(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Токен не предоставлен'
      }), { status: 401, headers: corsHeaders });
    }

    const parts = token.split('-');
    if (parts.length < 2) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Неверный формат токена'
      }), { status: 401, headers: corsHeaders });
    }

    const timestamp = parseInt(parts[parts.length - 1]);
    if (isNaN(timestamp)) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Неверный формат токена'
      }), { status: 401, headers: corsHeaders });
    }

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now - timestamp > sevenDays) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Токен истёк'
      }), { status: 401, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      valid: true,
      username: 'Egor',
      expiresAt: timestamp + sevenDays
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      valid: false,
      error: 'Ошибка проверки токена',
      details: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ==================== MAIN WORKER ====================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Routes
    if (url.pathname === '/api/auth/login') {
      return handleLogin(request);
    }

    if (url.pathname === '/api/auth/verify') {
      return handleVerify(request);
    }

    if (url.pathname === '/api/sessions') {
      // TODO: Implement sessions API
      return new Response('Sessions API - coming soon', { status: 501 });
    }

    if (url.pathname === '/api/rating') {
      // TODO: Implement rating API
      return new Response('Rating API - coming soon', { status: 501 });
    }

    if (url.pathname.startsWith('/api/players/')) {
      // TODO: Implement player API
      return new Response('Player API - coming soon', { status: 501 });
    }

    // Статические файлы
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(__STATIC_CONTENT_MANIFEST),
        }
      );
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  },
};
