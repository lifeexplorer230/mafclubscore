// API endpoint: POST /api/auth/login
// Авторизация оператора

// Секретный ключ для подписи JWT (в продакшене лучше хранить в Environment Variables)
const JWT_SECRET = 'maf-club-secret-key-2025-showtime-unnatov';

// Учётные данные (в продакшене лучше хранить хеши в базе данных)
const VALID_CREDENTIALS = {
  username: 'Egor',
  password: 'unnatov14'
};

// Создание JWT токена
async function createJWT(payload) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const unsignedToken = `${base64Header}.${base64Payload}`;

  // Подписываем токен с помощью HMAC SHA-256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(unsignedToken)
  );

  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsignedToken}.${base64Signature}`;
}

// Проверка JWT токена
export async function verifyJWT(token) {
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Обработка preflight запроса
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Получаем данные
    const { username, password } = await request.json();

    // Проверяем учётные данные
    if (username === VALID_CREDENTIALS.username &&
        password === VALID_CREDENTIALS.password) {

      // Создаём JWT токен (действителен 7 дней)
      const payload = {
        username: username,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 дней в миллисекундах
      };

      const token = await createJWT(payload);

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
      // Неверные учётные данные
      return new Response(JSON.stringify({
        success: false,
        error: 'Неверный логин или пароль'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка авторизации',
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
