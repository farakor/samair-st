# 🔒 Руководство по безопасности SamAir

## ✅ Реализованные меры безопасности

### 1. Аутентификация и авторизация
- ✅ **Хеширование паролей** с использованием bcrypt (12+ раундов)
- ✅ **JWT токены** для аутентификации с истечением срока действия
- ✅ **Ролевая система доступа** (superadmin, full_access, view_only)
- ✅ **Валидация токенов** на каждом запросе
- ✅ **Автоматический logout** при истечении токена

### 2. Защита API
- ✅ **Rate limiting** для предотвращения DDoS и брутфорс атак
- ✅ **CORS настройки** для ограничения доменов
- ✅ **Helmet.js** для установки security headers
- ✅ **Валидация входных данных** с помощью express-validator
- ✅ **Sanitization** HTML для защиты от XSS
- ✅ **CSRF защита** через SameSite cookies

### 3. Безопасность файлов
- ✅ **Проверка типов файлов** (только .xlsx, .xls, .csv)
- ✅ **Ограничение размера файлов** (максимум 50MB)
- ✅ **Sanitization имен файлов** для предотвращения path traversal
- ✅ **Случайные имена файлов** для предотвращения коллизий
- ✅ **Проверка MIME types** для дополнительной валидации

### 4. Конфигурация и секреты
- ✅ **Переменные окружения** для всех чувствительных данных
- ✅ **Отдельные конфиги** для development и production
- ✅ **Проверка обязательных переменных** при старте
- ✅ **Исключение .env файлов** из системы контроля версий

### 5. Логирование и мониторинг
- ✅ **Логирование всех запросов** с IP адресами
- ✅ **Логирование ошибок аутентификации**
- ✅ **Мониторинг неудачных попыток входа**

## 🔧 Настройка для продакшн

### 1. Обязательные шаги перед деплоем

```bash
# 1. Создайте файл .env на основе .env.production
cp server/.env.production server/.env

# 2. ОБЯЗАТЕЛЬНО измените эти значения:
# - JWT_SECRET (минимум 64 символа)
# - DB_PASSWORD (сложный пароль)
# - SMTP_PASS и IMAP_PASS (app passwords)
# - CORS_ORIGIN (ваш домен)
```

### 2. Настройка базы данных

```sql
-- Создайте пользователя базы данных с ограниченными правами
CREATE USER samair_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE samair_db_prod OWNER samair_user;

-- Предоставьте минимальные необходимые права
GRANT CONNECT ON DATABASE samair_db_prod TO samair_user;
GRANT USAGE ON SCHEMA public TO samair_user;
GRANT CREATE ON SCHEMA public TO samair_user;
```

### 3. Настройка HTTPS

```nginx
# Пример конфигурации Nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Настройка firewall

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw deny 3001/tcp  # Заблокировать прямой доступ к приложению
sudo ufw enable

# Или iptables
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 3001 -j DROP
```

## ⚠️ Важные предупреждения

### 1. Критически важные действия
- 🚨 **НИКОГДА не используйте дефолтные пароли в продакшн**
- 🚨 **ОБЯЗАТЕЛЬНО измените JWT_SECRET перед деплоем**
- 🚨 **Включите HTTPS для продакшн-среды**
- 🚨 **Регулярно обновляйте зависимости**

### 2. Мониторинг и аудит
- 📊 Настройте мониторинг логов на подозрительную активность
- 📊 Регулярно проверяйте неудачные попытки входа
- 📊 Мониторьте использование ресурсов сервера
- 📊 Настройте алерты на критические ошибки

### 3. Резервное копирование
- 💾 Настройте автоматические бекапы базы данных
- 💾 Создавайте резервные копии конфигурационных файлов
- 💾 Тестируйте процедуры восстановления

## 🔍 Проверка безопасности

### Чек-лист для аудита безопасности:

- [ ] JWT_SECRET изменен и содержит минимум 64 символа
- [ ] Все пароли БД изменены с дефолтных
- [ ] HTTPS настроен и работает
- [ ] CORS настроен только для вашего домена
- [ ] Firewall настроен и активен
- [ ] Rate limiting работает
- [ ] Логирование настроено
- [ ] Мониторинг активен
- [ ] Резервное копирование настроено
- [ ] Обновления безопасности установлены

### Инструменты для тестирования:

```bash
# Проверка SSL
nmap --script ssl-enum-ciphers -p 443 your-domain.com

# Проверка заголовков безопасности
curl -I https://your-domain.com

# Проверка rate limiting
ab -n 100 -c 10 https://your-domain.com/api/auth/login
```

## 📞 Контакты

При обнаружении уязвимостей безопасности, пожалуйста, свяжитесь с администратором системы.

---

**Помните**: Безопасность - это процесс, а не состояние. Регулярно обновляйте систему и проводите аудиты безопасности.