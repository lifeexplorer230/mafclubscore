# Data Export Guide

## Обзор

Экспорт данных в различных форматах: CSV, Excel CSV, JSON, HTML.

## Использование

### Базовое использование

```javascript
import {
  exportCSV,
  exportExcel,
  exportJSON,
  exportRating,
  exportPlayerStats
} from './shared/data-exporter.js';

// Экспорт любых данных
const data = [
  { id: 1, name: 'Player 1', score: 100 },
  { id: 2, name: 'Player 2', score: 90 }
];

// В разных форматах
exportCSV(data, 'players.csv');
exportExcel(data, 'players.csv');  // Excel-compatible
exportJSON(data, 'players.json');
```

### Специализированные экспорты

```javascript
// Экспорт рейтинга
await exportRating('csv');    // CSV формат
await exportRating('excel');  // Excel формат
await exportRating('json');   // JSON формат

// Экспорт статистики игрока
await exportPlayerStats(123, 'csv');
await exportPlayerStats(123, 'json');
```

### UI кнопка экспорта

```javascript
import { createExportButton } from './shared/data-exporter.js';

// Для рейтинга
const ratingExportBtn = createExportButton('rating');
document.querySelector('#rating-section').appendChild(ratingExportBtn);

// Для статистики игрока
const playerExportBtn = createExportButton('player', playerId);
document.querySelector('#player-section').appendChild(playerExportBtn);
```

## API Reference

### Конвертеры

#### `toCSV(data, options)`

Конвертирует массив объектов в CSV.

```javascript
import { toCSV } from './shared/data-exporter.js';

const csv = toCSV(data, {
  delimiter: ',',        // Разделитель (default: ',')
  includeHeaders: true,  // Включить заголовки (default: true)
  columns: ['id', 'name'] // Какие колонки экспортировать (default: все)
});

// Результат:
// id,name
// 1,Player 1
// 2,Player 2
```

**Особенности:**
- Автоматическое экранирование кавычек и спецсимволов
- Обработка null/undefined значений
- Поддержка многострочных значений

#### `toExcelCSV(data, options)`

Конвертирует в Excel-совместимый CSV.

```javascript
const csv = toExcelCSV(data);
```

**Отличия от обычного CSV:**
- Разделитель: `;` (semicolon)
- UTF-8 BOM prefix (`\uFEFF`) для корректной кодировки в Excel
- Лучше открывается в Microsoft Excel

#### `toJSON(data, options)`

Конвертирует в JSON.

```javascript
const json = toJSON(data, {
  pretty: true  // Форматировать с отступами (default: true)
});
```

#### `toHTML(data, options)`

Генерирует HTML таблицу.

```javascript
const html = toHTML(data, {
  className: 'export-table',  // CSS класс (default: 'export-table')
  columns: ['id', 'name']     // Какие колонки показать
});
```

**Результат:**
```html
<table class="export-table">
  <thead>
    <tr>
      <th>id</th>
      <th>name</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Player 1</td>
    </tr>
  </tbody>
</table>
```

### Экспортеры с скачиванием

#### `exportCSV(data, filename, options)`

```javascript
exportCSV(players, 'players-2025.csv', {
  delimiter: ',',
  columns: ['id', 'name', 'rating']
});
```

#### `exportExcel(data, filename, options)`

```javascript
exportExcel(players, 'players-2025.csv');
```

#### `exportJSON(data, filename, options)`

```javascript
exportJSON(players, 'players-2025.json', {
  pretty: true
});
```

### Специализированные экспорты

#### `exportRating(format)`

Экспортирует рейтинг из `/api/rating`.

```javascript
await exportRating('csv');
await exportRating('excel');
await exportRating('json');
```

**Автоматически:**
- Получает данные с API
- Добавляет timestamp в имя файла
- Обрабатывает ошибки

#### `exportPlayerStats(playerId, format)`

Экспортирует статистику игрока из `/api/player?id={playerId}`.

```javascript
await exportPlayerStats(123, 'csv');
await exportPlayerStats(123, 'json');
```

### UI Helpers

#### `createExportButton(dataType, dataId)`

Создаёт кнопку с dropdown меню для экспорта.

```javascript
// Для рейтинга
const btn = createExportButton('rating');

// Для игрока
const btn = createExportButton('player', playerId);
```

**Создаёт:**
- Кнопку "📥 Export"
- Dropdown меню с вариантами: CSV, Excel CSV, JSON
- Автоматическую обработку кликов

#### `downloadFile(content, filename, mimeType)`

Low-level функция для скачивания файла.

```javascript
downloadFile('Hello, World!', 'test.txt', 'text/plain');
```

## Интеграция

### Добавить экспорт на страницу рейтинга

```html
<!-- index.html -->
<div id="rating-controls"></div>

<script type="module">
import { createExportButton, exportCSS } from './shared/data-exporter.js';

// Добавить CSS
document.head.insertAdjacentHTML('beforeend', exportCSS);

// Добавить кнопку
const exportBtn = createExportButton('rating');
document.getElementById('rating-controls').appendChild(exportBtn);
</script>
```

### Добавить экспорт на страницу игрока

```html
<!-- player.html -->
<div id="player-export"></div>

<script type="module">
import { createExportButton, exportCSS } from './shared/data-exporter.js';

document.head.insertAdjacentHTML('beforeend', exportCSS);

const playerId = getPlayerIdFromURL();
const exportBtn = createExportButton('player', playerId);
document.getElementById('player-export').appendChild(exportBtn);
</script>
```

### Кастомный экспорт

```javascript
import { toCSV, downloadFile } from './shared/data-exporter.js';

// Получаем данные
const data = await fetchCustomData();

// Фильтруем/преобразуем
const filtered = data.filter(row => row.active);

// Экспортируем только нужные колонки
const csv = toCSV(filtered, {
  columns: ['id', 'name', 'score'],
  delimiter: ';'
});

downloadFile(csv, 'custom-export.csv', 'text/csv;charset=utf-8;');
```

## Форматы данных

### CSV

**Плюсы:**
- Универсальный формат
- Открывается в Excel, Google Sheets, текстовых редакторах
- Компактный размер

**Минусы:**
- Нет типов данных (всё строки)
- Проблемы с кодировкой в некоторых редакторах

**Когда использовать:**
- Для импорта в другие системы
- Для анализа в Excel/Sheets
- Для bulk operations

### Excel CSV

**Плюсы:**
- Гарантированно открывается в Excel с правильной кодировкой
- Сохраняет кириллицу

**Минусы:**
- Разделитель `;` может не подойти для некоторых систем

**Когда использовать:**
- Для пользователей Windows + Excel
- Когда важна кириллица

### JSON

**Плюсы:**
- Сохраняет типы данных
- Структурированный формат
- Легко парсится программами

**Минусы:**
- Больше размер
- Не открывается в Excel

**Когда использовать:**
- Для программной обработки
- Для backup/restore
- Для API integration

### HTML

**Плюсы:**
- Визуально красиво
- Можно стилизовать
- Копируется в документы

**Минусы:**
- Только для просмотра
- Большой размер

**Когда использовать:**
- Для отчётов
- Для документации
- Для печати

## Best Practices

### 1. Добавляйте timestamp в имена файлов

```javascript
const timestamp = new Date().toISOString().split('T')[0];
exportCSV(data, `export-${timestamp}.csv`);
```

### 2. Указывайте только нужные колонки

```javascript
exportCSV(data, 'export.csv', {
  columns: ['id', 'name', 'score'] // Не экспортировать всё подряд
});
```

### 3. Обрабатывайте ошибки

```javascript
try {
  await exportRating('csv');
} catch (error) {
  console.error('Export failed:', error);
  alert('Не удалось экспортировать данные');
}
```

### 4. Добавляйте loading state

```javascript
button.textContent = 'Экспортирую...';
button.disabled = true;

try {
  await exportRating('csv');
} finally {
  button.textContent = '📥 Export';
  button.disabled = false;
}
```

### 5. Проверяйте размер данных

```javascript
if (data.length > 10000) {
  const confirm = window.confirm(`Export ${data.length} rows? This may take a while.`);
  if (!confirm) return;
}
```

## Troubleshooting

### Неправильная кодировка в Excel

**Проблема:** Кириллица отображается иероглифами

**Решение:** Используйте `exportExcel()` вместо `exportCSV()`:
```javascript
exportExcel(data, 'file.csv'); // Включает UTF-8 BOM
```

### Скачивание не работает

**Проблема:** `downloadFile()` не скачивает файл

**Причина:** Блокировка popup/download браузером

**Решение:**
- Вызывайте только в обработчике события клика
- Не вызывайте в async callback или setTimeout

```javascript
// ❌ Не работает
setTimeout(() => {
  downloadFile(content, 'file.csv');
}, 1000);

// ✅ Работает
button.addEventListener('click', () => {
  downloadFile(content, 'file.csv');
});
```

### Большие файлы тормозят браузер

**Проблема:** Экспорт 100k+ строк зависает

**Решение:** Разбейте на чанки или используйте Web Workers:

```javascript
// Показать прогресс
function exportLargeDataset(data) {
  const chunks = chunkArray(data, 1000);
  let csv = '';

  chunks.forEach((chunk, i) => {
    csv += toCSV(chunk, { includeHeaders: i === 0 });
    updateProgress(i / chunks.length);
  });

  downloadFile(csv, 'large.csv');
}
```

## Security

### ⚠️ Внимание

**НЕ экспортируйте sensitive данные:**
- Пароли
- Токены
- Personal info (если не authorized)

**Пример защиты:**

```javascript
// ❌ Плохо
exportJSON(users, 'users.json'); // Экспортирует всё

// ✅ Хорошо
const safeData = users.map(u => ({
  id: u.id,
  name: u.name,
  rating: u.rating
  // НЕ экспортируем: email, password, tokens
}));

exportJSON(safeData, 'users.json');
```
