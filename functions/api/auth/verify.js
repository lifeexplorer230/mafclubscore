// API endpoint: POST /api/auth/verify
// Проверка действительности JWT токена

const JWT_SECRET = 'maf-club-secret-key-2025-showtime-unnatov';

// Проверка JWT токена (дубликат из login.js)
async function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [base64Header, base64Payload, base64Signature] = parts;
    const unsignedToken = `${base64Header}.${base64Payload}`;

    // Проверяем подпись
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(base64Signature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(unsignedToken)
    );

    if (!isValid) return null;

    // Декодируем payload
    const payload = JSON.parse(atob(base64Payload));

    // Проверяем срок действия
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Токен истёк
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

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
