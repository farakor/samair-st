#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Генерирует безопасные секреты для продакшн-среды
 */

console.log('🔐 Генерация безопасных секретов для SamAir...\n');

// Генерируем JWT секрет (64 байта = 128 символов в hex)
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Генерируем секрет сессии (32 байта = 64 символа в hex)
const sessionSecret = crypto.randomBytes(32).toString('hex');

// Генерируем пароль для базы данных (24 символа, включая спец. символы)
const dbPassword = generateSecurePassword(24);

// Генерируем случайный пароль для суперадмина
const adminPassword = generateSecurePassword(16);

console.log('✅ Сгенерированные секреты:');
console.log('='.repeat(50));
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`DB_PASSWORD=${dbPassword}`);
console.log(`ADMIN_PASSWORD=${adminPassword}`);
console.log('='.repeat(50));

// Создаем файл .env.generated с новыми секретами
const envContent = `# Автоматически сгенерированные секреты
# Дата генерации: ${new Date().toISOString()}

# КРИТИЧЕСКИ ВАЖНО: Сохраните эти секреты в безопасном месте!

# JWT конфигурация
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

# Сессии
SESSION_SECRET=${sessionSecret}

# База данных
DB_PASSWORD=${dbPassword}

# Пароль суперадминистратора
ADMIN_PASSWORD=${adminPassword}

# Конфигурация безопасности
BCRYPT_ROUNDS=14
NODE_ENV=production

# CORS (ОБЯЗАТЕЛЬНО измените на ваш домен!)
CORS_ORIGIN=https://your-domain.com

# Rate limiting для продакшн
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Другие настройки (настройте под свою среду)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=samair_db_prod
DB_USER=samair_user

PORT=3001

# SMTP настройки (настройте под свой SMTP сервер)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# IMAP настройки (настройте под свой IMAP сервер)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=your_email@gmail.com
IMAP_PASS=your_app_password

# Логирование
LOG_LEVEL=warn
LOG_FILE=logs/samair.log

# Безопасность файлов
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

# SSL (если используется)
TRUST_PROXY=true
SECURE_COOKIES=true
`;

const envPath = path.join(__dirname, '../server/.env.generated');
fs.writeFileSync(envPath, envContent);

console.log(`\n💾 Секреты сохранены в файл: ${envPath}`);
console.log('\n🚨 ВАЖНЫЕ ИНСТРУКЦИИ:');
console.log('1. Скопируйте содержимое .env.generated в .env');
console.log('2. Настройте SMTP/IMAP параметры под ваш почтовый сервер');
console.log('3. Измените CORS_ORIGIN на ваш домен');
console.log('4. Настройте параметры базы данных');
console.log('5. НИКОГДА не коммитьте файлы с секретами в git!');
console.log('6. Сохраните пароли в безопасном менеджере паролей');

console.log('\n🔧 Команды для настройки:');
console.log(`cp ${envPath} server/.env`);
console.log('npm run build');
console.log('npm run server');

// Создаем SQL скрипт для настройки БД
const sqlContent = `-- Скрипт настройки базы данных для SamAir
-- Дата генерации: ${new Date().toISOString()}

-- Создание пользователя базы данных
CREATE USER samair_user WITH PASSWORD '${dbPassword}';

-- Создание базы данных
CREATE DATABASE samair_db_prod OWNER samair_user;

-- Подключение к базе данных
\\c samair_db_prod;

-- Предоставление прав доступа
GRANT CONNECT ON DATABASE samair_db_prod TO samair_user;
GRANT USAGE ON SCHEMA public TO samair_user;
GRANT CREATE ON SCHEMA public TO samair_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO samair_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO samair_user;

-- Предоставление прав на будущие таблицы
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO samair_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO samair_user;

-- Создание таблиц будет выполнено автоматически при первом запуске приложения
`;

const sqlPath = path.join(__dirname, '../database-setup.sql');
fs.writeFileSync(sqlPath, sqlContent);

console.log(`\n💾 SQL скрипт сохранен в: ${sqlPath}`);
console.log('Выполните этот скрипт от имени суперпользователя PostgreSQL:');
console.log(`psql -U postgres -f ${sqlPath}`);

console.log('\n✅ Генерация секретов завершена!');

/**
 * Генерирует безопасный пароль
 */
function generateSecurePassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Обеспечиваем минимум по одному символу каждого типа
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];
  
  // Заполняем оставшуюся длину
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Перемешиваем символы
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}