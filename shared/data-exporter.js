/**
 * Data Export Utilities
 * Phase 4.2: New Features
 *
 * Экспорт данных в CSV, JSON, Excel форматы
 */

/**
 * Конвертирует массив объектов в CSV
 */
export function toCSV(data, options = {}) {
  const {
    delimiter = ',',
    includeHeaders = true,
    columns = null
  } = options;

  if (!data || data.length === 0) {
    return '';
  }

  // Определяем колонки
  const cols = columns || Object.keys(data[0]);

  // Экранирует значения
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [];

  // Headers
  if (includeHeaders) {
    lines.push(cols.map(escape).join(delimiter));
  }

  // Data rows
  data.forEach(row => {
    const values = cols.map(col => escape(row[col]));
    lines.push(values.join(delimiter));
  });

  return lines.join('\n');
}

/**
 * Конвертирует в JSON
 */
export function toJSON(data, options = {}) {
  const { pretty = true } = options;
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/**
 * Создаёт Excel-совместимый CSV (с BOM для UTF-8)
 */
export function toExcelCSV(data, options = {}) {
  const csv = toCSV(data, { ...options, delimiter: ';' });
  return '\uFEFF' + csv; // BOM for UTF-8
}

/**
 * Генерирует HTML table
 */
export function toHTML(data, options = {}) {
  const { className = 'export-table', columns = null } = options;

  if (!data || data.length === 0) {
    return '<p>No data</p>';
  }

  const cols = columns || Object.keys(data[0]);

  let html = `<table class="${className}">\n`;

  // Header
  html += '  <thead>\n    <tr>\n';
  cols.forEach(col => {
    html += `      <th>${escapeHTML(col)}</th>\n`;
  });
  html += '    </tr>\n  </thead>\n';

  // Body
  html += '  <tbody>\n';
  data.forEach(row => {
    html += '    <tr>\n';
    cols.forEach(col => {
      html += `      <td>${escapeHTML(row[col])}</td>\n`;
    });
    html += '    </tr>\n';
  });
  html += '  </tbody>\n';

  html += '</table>';
  return html;
}

/**
 * Экранирует HTML
 */
function escapeHTML(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Триггерит скачивание файла
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Экспортирует данные в CSV
 */
export function exportCSV(data, filename = 'export.csv', options = {}) {
  const csv = toCSV(data, options);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  console.log(`[Export] CSV: ${filename} (${data.length} rows)`);
}

/**
 * Экспортирует в Excel CSV
 */
export function exportExcel(data, filename = 'export.csv', options = {}) {
  const csv = toExcelCSV(data, options);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  console.log(`[Export] Excel CSV: ${filename} (${data.length} rows)`);
}

/**
 * Экспортирует в JSON
 */
export function exportJSON(data, filename = 'export.json', options = {}) {
  const json = toJSON(data, options);
  downloadFile(json, filename, 'application/json');
  console.log(`[Export] JSON: ${filename} (${data.length} items)`);
}

/**
 * Экспортирует rating в различных форматах
 */
export async function exportRating(format = 'csv') {
  try {
    // Получаем данные
    const response = await fetch('/api/rating');
    const data = await response.json();

    if (!data || !data.players) {
      throw new Error('No data available');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const players = data.players;

    switch (format.toLowerCase()) {
      case 'csv':
        exportCSV(players, `rating-${timestamp}.csv`);
        break;
      case 'excel':
        exportExcel(players, `rating-${timestamp}.csv`);
        break;
      case 'json':
        exportJSON(players, `rating-${timestamp}.json`);
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  } catch (error) {
    console.error('[Export] Failed:', error);
    alert('Export failed: ' + error.message);
  }
}

/**
 * Экспортирует player stats
 */
export async function exportPlayerStats(playerId, format = 'csv') {
  try {
    const response = await fetch(`/api/player?id=${playerId}`);
    const data = await response.json();

    if (!data || !data.games) {
      throw new Error('No data available');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const games = data.games;

    const filename = `player-${playerId}-${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        exportCSV(games, `${filename}.csv`);
        break;
      case 'excel':
        exportExcel(games, `${filename}.csv`);
        break;
      case 'json':
        exportJSON({ player: data.player, games }, `${filename}.json`);
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  } catch (error) {
    console.error('[Export] Failed:', error);
    alert('Export failed: ' + error.message);
  }
}

/**
 * Создаёт UI для экспорта
 */
export function createExportButton(dataType = 'rating', dataId = null) {
  const container = document.createElement('div');
  container.className = 'export-controls';

  const button = document.createElement('button');
  button.textContent = '📥 Export';
  button.className = 'export-button';

  const menu = document.createElement('div');
  menu.className = 'export-menu';
  menu.style.display = 'none';

  const formats = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel CSV', value: 'excel' },
    { label: 'JSON', value: 'json' }
  ];

  formats.forEach(({ label, value }) => {
    const item = document.createElement('button');
    item.textContent = label;
    item.addEventListener('click', async () => {
      menu.style.display = 'none';

      if (dataType === 'rating') {
        await exportRating(value);
      } else if (dataType === 'player' && dataId) {
        await exportPlayerStats(dataId, value);
      }
    });
    menu.appendChild(item);
  });

  button.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });

  container.appendChild(button);
  container.appendChild(menu);

  return container;
}

// CSS для export UI
export const exportCSS = `
<style>
.export-controls {
  position: relative;
  display: inline-block;
}

.export-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 4px;
  min-width: 150px;
  z-index: 1000;
}

.export-menu button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.export-menu button:hover {
  background: #f5f5f5;
}
</style>
`;
