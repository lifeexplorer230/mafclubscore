/**
 * Example: Compressed API Endpoint
 *
 * Демонстрирует использование compression middleware для API endpoint
 */

import { autoCompress } from '../shared/compression.js';
import { executeQuery } from '../shared/database.js';

/**
 * Handler без сжатия
 */
async function handler(request) {
  try {
    // Получаем большой объём данных
    const result = await executeQuery(`
      SELECT
        p.id,
        p.name,
        p.nickname,
        COUNT(DISTINCT gr.game_id) as games_count,
        SUM(CASE WHEN gr.is_winner = 1 THEN 1 ELSE 0 END) as wins,
        AVG(gr.points) as avg_points
      FROM players p
      LEFT JOIN game_results gr ON p.id = gr.player_id
      GROUP BY p.id
      ORDER BY avg_points DESC
    `);

    // Формируем большой JSON ответ
    const rating = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      nickname: row.nickname,
      statistics: {
        gamesPlayed: row.games_count,
        wins: row.wins,
        avgPoints: parseFloat(row.avg_points || 0).toFixed(2),
        winRate: row.games_count > 0
          ? ((row.wins / row.games_count) * 100).toFixed(1)
          : '0.0'
      },
      // Добавляем много дополнительной информации для демо
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: 'v1.13.5',
        source: 'database'
      }
    }));

    // Возвращаем большой JSON
    return new Response(JSON.stringify({
      success: true,
      data: rating,
      total: rating.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache 5 min
      }
    });

  } catch (error) {
    console.error('[API] Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch rating data',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Export с автоматическим сжатием
 *
 * autoCompress автоматически:
 * 1. Проверяет Accept-Encoding клиента
 * 2. Выбирает оптимальный формат (br > gzip)
 * 3. Сжимает ответ если размер > 1KB
 * 4. Добавляет правильные заголовки
 * 5. Логирует статистику сжатия
 */
export default autoCompress(handler);

/**
 * Без сжатия (для сравнения):
 * export default handler;
 *
 * Пример ответа:
 * - Размер: 45 KB (uncompressed)
 * - Transfer time (3G): ~450ms
 *
 * С autoCompress:
 * - Размер: 12 KB (brotli)
 * - Transfer time (3G): ~120ms
 * - Экономия: 73% bandwidth, 73% быстрее
 */
