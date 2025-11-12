// API endpoint: POST /api/auth/verify
// Проверка действительности JWT токена

import { verifyJWT } from './login.js';

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Обработка preflight запроса
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Получаем токен из заголовка или тела запроса
    let token = request.headers.get('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else {
      const body = await request.json();
      token = body.token;
    }

    if (!token) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Токен не предоставлен'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Проверяем токен
    const payload = await verifyJWT(token);

    if (payload) {
      return new Response(JSON.stringify({
        valid: true,
        username: payload.username,
        expiresAt: payload.exp
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Токен недействителен или истёк'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    return new Response(JSON.stringify({
      valid: false,
      error: 'Ошибка проверки токена',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
