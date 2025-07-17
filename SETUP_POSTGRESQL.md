# Настройка PostgreSQL для Samair Admin

## Установка PostgreSQL

### macOS (с Homebrew)
```bash
# Установка PostgreSQL
brew install postgresql

# Запуск сервиса
brew services start postgresql

# Проверка статуса
brew services list | grep postgresql
```

### Ubuntu/Debian
```bash
# Обновление пакетов
sudo apt update

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib

# Запуск сервиса
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows
1. Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/
2. Запустите установщик и следуйте инструкциям
3. Запомните пароль для пользователя `postgres`

## Настройка базы данных

### 1. Подключитесь к PostgreSQL
```bash
# Подключение под пользователем postgres
sudo -u postgres psql

# Или на Windows/macOS
psql -U postgres
```

### 2. Создайте базу данных и пользователя
```sql
-- Создание пользователя
CREATE USER samair_user WITH PASSWORD 'samair_password';

-- Создание базы данных
CREATE DATABASE samair_db OWNER samair_user;

-- Предоставление всех прав пользователю на базу данных
GRANT ALL PRIVILEGES ON DATABASE samair_db TO samair_user;

-- Выход из psql
\q
```

### 3. Создайте файл переменных окружения

Создайте файл `server/.env` со следующим содержимым:

```env
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=samair_db
DB_USER=samair_user
DB_PASSWORD=samair_password

# Сервер
PORT=3001

# Email настройки (сохраняем существующие)
EMAIL_HOST=
EMAIL_PORT=993
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_TLS=true
```

**⚠️ Важно:** Файл `.env` должен быть в папке `server/` и НЕ должен попадать в Git (уже добавлен в .gitignore).

## Запуск приложения

### 1. Запустите PostgreSQL сервер
```bash
# macOS с Homebrew
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Windows - PostgreSQL должен запускаться автоматически
```

### 2. Проверьте подключение к базе данных
```bash
# Проверка подключения
psql -h localhost -U samair_user -d samair_db
# Введите пароль: samair_password
```

### 3. Запустите сервер приложения
```bash
# Запуск только сервера
npm run server

# Или запуск сервера и фронтенда одновременно
npm run dev
```

При первом запуске сервер автоматически:
- Проверит подключение к PostgreSQL
- Создаст необходимые таблицы
- Настроит индексы для оптимизации

## Проверка работы

1. Откройте http://localhost:3001 в браузере
2. В консоли браузера должно появиться сообщение "Загружаем данные из PostgreSQL..."
3. В логах сервера должно быть "Подключение к PostgreSQL успешно"

## Миграция данных

Если у вас уже есть данные в IndexedDB/localStorage, они автоматически перенесутся в PostgreSQL при первой загрузке файлов или рейсов.

## Управление базой данных

### Подключение к базе данных
```bash
psql -h localhost -U samair_user -d samair_db
```

### Полезные SQL команды
```sql
-- Просмотр всех таблиц
\dt

-- Количество файлов
SELECT COUNT(*) FROM uploaded_files;

-- Количество рейсов
SELECT COUNT(*) FROM flight_data;

-- Статистика по типам ВС
SELECT aircraft_type, COUNT(*) 
FROM flight_data 
WHERE aircraft_type IS NOT NULL AND aircraft_type != ''
GROUP BY aircraft_type 
ORDER BY COUNT(*) DESC;

-- Очистка всех данных (если нужно)
DELETE FROM flight_data;
DELETE FROM uploaded_files;
```

## Решение проблем

### Проблема: "connection refused"
- Убедитесь, что PostgreSQL запущен
- Проверьте правильность настроек в `.env`

### Проблема: "authentication failed"
- Проверьте пользователя и пароль в `.env`
- Убедитесь, что пользователь создан правильно

### Проблема: "database does not exist"
- Создайте базу данных согласно инструкции выше

### Fallback режим
Если PostgreSQL недоступен, приложение автоматически переключится на IndexedDB для локального хранения данных.

## Преимущества PostgreSQL

✅ **Надежность** - данные хранятся на сервере, не теряются при очистке браузера  
✅ **Производительность** - быстрые запросы и фильтрация больших объемов данных  
✅ **Масштабируемость** - поддержка миллионов записей  
✅ **Многопользовательский доступ** - несколько пользователей могут работать с одними данными  
✅ **Резервное копирование** - возможность создания бэкапов  
✅ **Аналитика** - мощные возможности для анализа данных 