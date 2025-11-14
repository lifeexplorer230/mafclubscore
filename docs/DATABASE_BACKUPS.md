# Database Backups Guide

## Обзор

Автоматические бэкапы Turso database для disaster recovery.

## Использование

### Создать бэкап

```bash
node scripts/backup-database.js create
```

### Список бэкапов

```bash
node scripts/backup-database.js list
```

### Удалить старые бэкапы

```bash
node scripts/backup-database.js clean
```

## Автоматизация

### Cron (daily backups)

```bash
# Каждый день в 2:00 AM
0 2 * * * cd /root/mafclubscore && node scripts/backup-database.js create
```

### GitHub Actions

```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node scripts/backup-database.js create
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
      - uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backups/
          retention-days: 30
```

## Восстановление из бэкапа

```bash
# 1. Найти нужный бэкап
node scripts/backup-database.js list

# 2. Восстановить через Turso CLI
turso db shell mafclub < backups/backup-2025-11-14.sql
```

## Configuration

```bash
# Environment variables
BACKUP_DIR=./backups       # Куда сохранять
RETENTION_DAYS=30          # Хранить 30 дней
```

## Формат бэкапа

SQL dump файл содержит:
- CREATE TABLE statements
- INSERT statements для всех данных
- Совместим с SQLite/Turso

## Размер бэкапов

Примерный размер:
- 1000 games: ~2 MB
- 10000 games: ~20 MB

## Best Practices

1. **Daily backups** - запускать каждый день
2. **Test restore** - периодически проверять восстановление
3. **Multiple locations** - хранить в нескольких местах
4. **Monitor space** - следить за размером директории
