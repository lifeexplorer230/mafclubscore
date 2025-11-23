import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

console.log('🧪 Тестируем создание 10 новых игроков...\n');

const startTotal = Date.now();

for (let i = 1; i <= 10; i++) {
  const timestamp = Date.now();
  const playerName = `TestPlayer_${timestamp}_${i}`;

  console.log(`\n--- Player ${i}: "${playerName}" ---`);

  // 1. Check if exists
  const t1 = Date.now();
  const check = await stagingDB.execute({
    sql: 'SELECT id FROM players WHERE LOWER(name) = LOWER(?)',
    args: [playerName]
  });
  const t2 = Date.now();
  console.log(`  SELECT check: ${t2 - t1}ms (found: ${check.rows.length})`);

  // 2. Insert new player
  const t3 = Date.now();
  const insert = await stagingDB.execute({
    sql: 'INSERT INTO players (name) VALUES (?)',
    args: [playerName]
  });
  const t4 = Date.now();
  const playerId = Number(insert.lastInsertRowid);
  console.log(`  INSERT player: ${t4 - t3}ms (id: ${playerId})`);

  // 3. Verify exists
  const t5 = Date.now();
  const verify = await stagingDB.execute({
    sql: 'SELECT id FROM players WHERE id = ?',
    args: [playerId]
  });
  const t6 = Date.now();
  console.log(`  SELECT verify: ${t6 - t5}ms (found: ${verify.rows.length})`);

  const totalForPlayer = t6 - t1;
  console.log(`  ⏱️  Total for player ${i}: ${totalForPlayer}ms`);
}

const endTotal = Date.now();
const totalTime = endTotal - startTotal;

console.log(`\n\n📊 ИТОГО:`);
console.log(`  Создано игроков: 10`);
console.log(`  Общее время: ${totalTime}ms`);
console.log(`  Среднее на игрока: ${Math.round(totalTime / 10)}ms`);

if (totalTime > 10000) {
  console.log(`\n  ⚠️  ПРЕДУПРЕЖДЕНИЕ: Больше 10 секунд! Timeout гарантирован.`);
} else if (totalTime > 5000) {
  console.log(`\n  ⚠️  ВНИМАНИЕ: Больше 5 секунд. Рискованно для 10-sec timeout.`);
} else {
  console.log(`\n  ✅ OK: Меньше 5 секунд. Должно работать.`);
}

process.exit(0);
