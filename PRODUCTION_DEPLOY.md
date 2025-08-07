# 🚀 Руководство по безопасному деплою SamAir

## 📋 Чек-лист подготовки к продакшн

### ✅ Все уязвимости исправлены:

1. **Аутентификация и авторизация**
   - ✅ Пароли хешируются с bcrypt (12+ раундов)
   - ✅ JWT токены с истечением срока действия
   - ✅ Ролевая система доступа
   - ✅ Защищенные API endpoints

2. **Защита от атак**
   - ✅ Rate limiting (защита от DDoS и брутфорс)
   - ✅ XSS защита (sanitization HTML)
   - ✅ CSRF защита (SameSite cookies)
   - ✅ SQL injection защита (параметризованные запросы)

3. **Безопасность файлов**
   - ✅ Проверка типов файлов
   - ✅ Ограничение размера файлов
   - ✅ Sanitization имен файлов
   - ✅ Случайные имена файлов

4. **Конфигурация**
   - ✅ Переменные окружения для секретов
   - ✅ Security headers (Helmet.js)
   - ✅ CORS настройки
   - ✅ Проверка обязательных переменных

## 🔧 Пошаговая инструкция деплоя

### Шаг 1: Выбор типа деплоя

**🐳 Docker деплой (рекомендуется для разработки):**
- Простая настройка
- Изолированная среда
- Быстрый запуск

**🖥️ Нативный деплой (рекомендуется для продакшн):**
- Лучшая производительность
- Полный контроль над системой
- Подходит для Server Core, Selectel и других хостинг-провайдеров

### Шаг 2: Генерация секретов (для нативного деплоя)

```bash
# Сгенерируйте безопасные секреты
npm run generate-secrets

# Это создаст файл server/.env.generated с безопасными паролями
```

### Шаг 3: Настройка переменных окружения

```bash
# Скопируйте сгенерированные секреты
cp server/.env.generated server/.env

# ОБЯЗАТЕЛЬНО отредактируйте файл .env:
nano server/.env
```

**Критически важные параметры для изменения:**

```bash
# Ваш домен (ОБЯЗАТЕЛЬНО измените!)
CORS_ORIGIN=https://your-domain.com

# SMTP/IMAP настройки (настройте под ваш почтовый сервер)
SMTP_HOST=smtp.your-domain.com
SMTP_USER=your_email@your-domain.com
SMTP_PASS=your_app_password

IMAP_HOST=imap.your-domain.com
IMAP_USER=your_email@your-domain.com
IMAP_PASS=your_app_password

# База данных (если нужно)
DB_HOST=your_db_host
DB_NAME=samair_db_prod
DB_USER=samair_user
```

### Шаг 3: Настройка базы данных

```bash
# Выполните SQL скрипт от имени суперпользователя PostgreSQL
psql -U postgres -f database-setup.sql
```

### Шаг 4: Сборка приложения

```bash
# Установите зависимости и соберите приложение
npm install
npm run build
```

### Шаг 5: Настройка системы

#### Создание пользователя системы

```bash
# Создайте пользователя для приложения
sudo useradd -r -s /bin/false samair
sudo mkdir -p /opt/samair
sudo chown samair:samair /opt/samair

# Скопируйте файлы приложения
sudo cp -r * /opt/samair/
sudo chown -R samair:samair /opt/samair
```

#### Настройка systemd service

```bash
# Создайте файл службы
sudo nano /etc/systemd/system/samair.service
```

```ini
[Unit]
Description=SamAir Application
After=network.target postgresql.service

[Service]
Type=simple
User=samair
Group=samair
WorkingDirectory=/opt/samair
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Безопасность
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/samair/server/data
ReadWritePaths=/opt/samair/logs

[Install]
WantedBy=multi-user.target
```

```bash
# Активируйте службу
sudo systemctl daemon-reload
sudo systemctl enable samair
sudo systemctl start samair

# Проверьте статус
sudo systemctl status samair
```

### Шаг 6: Настройка Nginx

```bash
# Установите Nginx
sudo apt update
sudo apt install nginx

# Создайте конфигурацию
sudo nano /etc/nginx/sites-available/samair
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL настройки
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Static files
    location /static/ {
        root /opt/samair/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes with rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main application
    location / {
        try_files $uri $uri/ @proxy;
    }

    location @proxy {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/samair /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 7: Настройка SSL (Let's Encrypt)

```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Настройте автоматическое обновление
sudo crontab -e
```

Добавьте в crontab:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

### Шаг 8: Настройка firewall

```bash
# UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 3001/tcp  # Блокируем прямой доступ к приложению
sudo ufw enable

# Проверьте правила
sudo ufw status
```

### Шаг 9: Мониторинг и логирование

```bash
# Создайте директорию для логов
sudo mkdir -p /opt/samair/logs
sudo chown samair:samair /opt/samair/logs

# Настройте logrotate
sudo nano /etc/logrotate.d/samair
```

```
/opt/samair/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 samair samair
    postrotate
        systemctl reload samair
    endscript
}
```

### Шаг 10: Первый запуск и тестирование

```bash
# Проверьте статус службы
sudo systemctl status samair

# Проверьте логи
sudo journalctl -u samair -f

# Проверьте доступность
curl -I https://your-domain.com
```

## 🔒 Финальная проверка безопасности

### Проверьте следующие параметры:

1. **HTTPS работает корректно**
   ```bash
   curl -I https://your-domain.com
   ```

2. **Rate limiting активен**
   ```bash
   # Должно вернуть 429 после нескольких запросов
   for i in {1..10}; do curl -I https://your-domain.com/api/auth/login; done
   ```

3. **Security headers присутствуют**
   ```bash
   curl -I https://your-domain.com | grep -E "(X-Frame|X-Content|Strict-Transport)"
   ```

4. **Прямой доступ к порту 3001 заблокирован**
   ```bash
   # Должно не работать
   curl http://your-domain.com:3001
   ```

5. **JWT токены работают**
   - Войдите в систему через веб-интерфейс
   - Проверьте, что аутентификация работает корректно

## 📞 Техническая поддержка

### Полезные команды для диагностики:

```bash
# Логи приложения
sudo journalctl -u samair -f

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Статус служб
sudo systemctl status samair
sudo systemctl status nginx
sudo systemctl status postgresql

# Проверка портов
sudo netstat -tlnp | grep -E "(80|443|3001|5432)"

# Проверка SSL
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### В случае проблем:

1. Проверьте логи службы
2. Убедитесь, что все переменные окружения настроены
3. Проверьте подключение к базе данных
4. Убедитесь, что порты открыты в firewall
5. Проверьте конфигурацию Nginx

---

## 🏢 Деплой на хостинг-провайдерах

### 🚀 Server Core (серверы на базе Ubuntu)

#### Подготовка сервера

```bash
# Подключитесь к серверу по SSH
ssh root@your-server-ip

# Обновите систему
apt update && apt upgrade -y

# Установите необходимые пакеты
apt install -y curl wget git nginx postgresql postgresql-contrib ufw fail2ban

# Установите Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Проверьте версии
node --version
npm --version
psql --version
```

#### Настройка PostgreSQL

```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# В psql выполните:
CREATE DATABASE samair_db;
CREATE USER samair_user WITH ENCRYPTED PASSWORD 'ваш_безопасный_пароль';
GRANT ALL PRIVILEGES ON DATABASE samair_db TO samair_user;
ALTER USER samair_user CREATEDB;
\q

# Настройте PostgreSQL для локальных подключений
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Добавьте строку:
```
local   samair_db       samair_user                     md5
```

```bash
# Перезапустите PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

#### Деплой приложения

```bash
# Создайте пользователя для приложения
sudo useradd -r -s /bin/false -m -d /opt/samair samair

# Клонируйте репозиторий
cd /opt
sudo git clone https://github.com/farakor/samair-st.git samair-app
sudo mv samair-app/* samair/
sudo rm -rf samair-app
sudo chown -R samair:samair /opt/samair

# Переключитесь в директорию приложения
cd /opt/samair

# Установите зависимости от имени пользователя samair
sudo -u samair npm install

# Соберите фронтенд
sudo -u samair npm run build
```

#### Настройка переменных окружения

```bash
# Создайте файл окружения
sudo -u samair nano /opt/samair/server/.env
```

**Конфигурация для Server Core:**
```bash
# Основные настройки
NODE_ENV=production
PORT=3001

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=samair_db
DB_USER=samair_user
DB_PASSWORD=ваш_безопасный_пароль

# JWT секреты (сгенерируйте безопасные)
JWT_SECRET=ваш_jwt_секрет_минимум_32_символа
JWT_REFRESH_SECRET=ваш_refresh_секрет_минимум_32_символа

# CORS (замените на ваш домен)
CORS_ORIGIN=https://your-domain.com

# SMTP настройки (для отправки писем)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# IMAP настройки (для получения писем)
IMAP_HOST=imap.your-provider.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=your-email@domain.com
IMAP_PASS=your-app-password

# Системные настройки
FILE_UPLOAD_PATH=/opt/samair/server/data/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv
```

#### Настройка systemd службы

```bash
# Создайте файл службы
sudo nano /etc/systemd/system/samair.service
```

```ini
[Unit]
Description=SamAir Flight Data Analysis System
Documentation=https://github.com/farakor/samair-st
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=samair
Group=samair
WorkingDirectory=/opt/samair
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=10
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
SyslogIdentifier=samair

# Переменные окружения
Environment=NODE_ENV=production
EnvironmentFile=/opt/samair/server/.env

# Безопасность
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/samair/server/data
ReadWritePaths=/opt/samair/logs
CapabilityBoundingSet=
AmbientCapabilities=
SecureBits=keep-caps-locked

# Ограничения ресурсов
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

```bash
# Создайте необходимые директории
sudo -u samair mkdir -p /opt/samair/server/data/uploads
sudo -u samair mkdir -p /opt/samair/logs

# Активируйте и запустите службу
sudo systemctl daemon-reload
sudo systemctl enable samair
sudo systemctl start samair

# Проверьте статус
sudo systemctl status samair
```

#### Настройка Nginx для Server Core

```bash
# Создайте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/samair
```

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/m;

# Upstream для приложения
upstream samair_app {
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

# HTTP редирект на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL конфигурация (обновится после получения сертификата)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';" always;
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/manifest+json
        image/svg+xml;
    
    # Логирование
    access_log /var/log/nginx/samair_access.log;
    error_log /var/log/nginx/samair_error.log;
    
    # Основные настройки
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Статические файлы
    location /static/ {
        alias /opt/samair/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # API маршруты с rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://samair_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/upload {
        limit_req zone=upload burst=1 nodelay;
        proxy_pass http://samair_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://samair_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Основное приложение
    location / {
        try_files $uri $uri/ @proxy;
    }
    
    location @proxy {
        proxy_pass http://samair_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/samair /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 🔐 Selectel (облачные серверы)

#### Особенности настройки для Selectel

**1. Подключение к серверу:**
```bash
# Используйте предоставленные Selectel данные
ssh root@your-selectel-server-ip
```

**2. Настройка firewall (дополнительно к UFW):**
```bash
# Selectel рекомендует дополнительные правила
ufw allow ssh
ufw allow 'Nginx Full'
ufw deny 3001/tcp
ufw enable

# Дополнительная защита
ufw limit ssh/tcp
ufw logging on
```

**3. Конфигурация для Selectel DNS:**
```bash
# В файле .env используйте публичный IP Selectel
CORS_ORIGIN=https://your-selectel-domain.com

# Для внутренней сети Selectel
DB_HOST=localhost  # или внутренний IP если БД на отдельном сервере
```

**4. Мониторинг для Selectel:**
```bash
# Установите мониторинг
apt install -y htop iotop nethogs

# Настройте автоматические обновления
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### 📊 Общие настройки для обеих платформ

#### Настройка SSL сертификата

```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Настройте автоматическое обновление
sudo crontab -e
# Добавьте: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Настройка мониторинга и логирования

```bash
# Настройте logrotate для приложения
sudo nano /etc/logrotate.d/samair
```

```
/opt/samair/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 samair samair
    postrotate
        systemctl reload samair
    endscript
}

/var/log/nginx/samair_*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        systemctl reload nginx
    endscript
}
```

#### Бэкап базы данных

```bash
# Создайте скрипт бэкапа
sudo nano /opt/samair/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/samair/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="samair_db"
DB_USER="samair_user"

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

# Создаем бэкап базы данных
su - samair -c "pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/samair_db_$DATE.sql"

# Создаем архив файлов
tar -czf $BACKUP_DIR/samair_files_$DATE.tar.gz /opt/samair/server/data

# Удаляем старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Сделайте скрипт исполняемым
sudo chmod +x /opt/samair/backup.sh

# Добавьте в crontab для ежедневного бэкапа в 2:00
sudo crontab -e
# Добавьте: 0 2 * * * /opt/samair/backup.sh >> /opt/samair/logs/backup.log 2>&1
```

#### Настройка fail2ban

```bash
# Настройте fail2ban для защиты от атак
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/samair_error.log
maxretry = 5

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/samair_error.log
maxretry = 10
```

```bash
# Перезапустите fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### 🧪 Тестирование развертывания

```bash
# Проверьте все службы
sudo systemctl status samair
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status fail2ban

# Проверьте подключение к базе данных
sudo -u samair psql -h localhost -U samair_user -d samair_db -c "SELECT version();"

# Проверьте веб-приложение
curl -I https://your-domain.com

# Проверьте API
curl -X GET https://your-domain.com/api/health

# Проверьте логи
sudo journalctl -u samair -n 50
sudo tail -f /var/log/nginx/samair_access.log
```

### 🚨 Устранение неполадок

#### Проблемы с базой данных:
```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение
sudo -u postgres psql -c "\l"

# Проверьте права пользователя
sudo -u postgres psql -c "\du"
```

#### Проблемы с приложением:
```bash
# Проверьте логи приложения
sudo journalctl -u samair -f

# Проверьте переменные окружения
sudo -u samair cat /opt/samair/server/.env

# Проверьте права на файлы
ls -la /opt/samair/
```

#### Проблемы с Nginx:
```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/samair_error.log
```

---

**🎉 Поздравляем! Ваше приложение SamAir теперь готово к работе в продакшн-среде с максимальным уровнем безопасности на любой хостинговой платформе.**