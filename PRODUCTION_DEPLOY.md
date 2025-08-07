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

### Шаг 1: Генерация секретов

```bash
# Сгенерируйте безопасные секреты
npm run generate-secrets

# Это создаст файл server/.env.generated с безопасными паролями
```

### Шаг 2: Настройка переменных окружения

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

**🎉 Поздравляем! Ваше приложение SamAir теперь готово к работе в продакшн-среде с максимальным уровнем безопасности.**