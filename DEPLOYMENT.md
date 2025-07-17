# Инструкции по развертыванию Samair ST

## 🚀 Развертывание в продакшене

### Вариант 1: Обычное развертывание

#### 1. Подготовка сервера
```bash
# Обновляем систему (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Устанавливаем PM2 для управления процессами
sudo npm install -g pm2

# Устанавливаем Nginx для проксирования
sudo apt install nginx -y
```

#### 2. Клонирование и настройка проекта
```bash
# Клонируем репозиторий
git clone https://github.com/YOUR_USERNAME/samair-st.git
cd samair-st

# Устанавливаем зависимости
npm install

# Собираем продакшен версию
npm run build
```

#### 3. Настройка PM2
```bash
# Создаем конфигурационный файл PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'samair-st',
    script: 'server/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF

# Запускаем приложение
pm2 start ecosystem.config.js

# Настраиваем автозапуск
pm2 startup
pm2 save
```

#### 4. Настройка Nginx
```bash
# Создаем конфигурацию Nginx
sudo cat > /etc/nginx/sites-available/samair-st << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
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
EOF

# Активируем сайт
sudo ln -s /etc/nginx/sites-available/samair-st /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Настройка SSL (Let's Encrypt)
```bash
# Устанавливаем Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получаем SSL сертификат
sudo certbot --nginx -d your-domain.com

# Проверяем автообновление
sudo certbot renew --dry-run
```

### Вариант 2: Docker развертывание

#### 1. Установка Docker
```bash
# Устанавливаем Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Устанавливаем Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавляем пользователя в группу docker
sudo usermod -aG docker $USER
```

#### 2. Запуск приложения
```bash
# Клонируем репозиторий
git clone https://github.com/YOUR_USERNAME/samair-st.git
cd samair-st

# Запускаем через Docker Compose
docker-compose up -d

# Проверяем статус
docker-compose ps
docker-compose logs
```

#### 3. Настройка Nginx для Docker
```bash
# Конфигурация Nginx для Docker
sudo cat > /etc/nginx/sites-available/samair-st-docker << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
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
EOF
```

## 🔧 Конфигурация для продакшена

### Переменные окружения
Создайте файл `.env` в корне проекта:
```bash
NODE_ENV=production
PORT=3001
```

### Настройка брандмауэра
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw enable
```

### Мониторинг и логи

#### PM2 мониторинг
```bash
# Просмотр статуса приложений
pm2 status

# Просмотр логов
pm2 logs samair-st

# Мониторинг в реальном времени
pm2 monit

# Перезапуск приложения
pm2 restart samair-st
```

#### Docker мониторинг
```bash
# Просмотр логов
docker-compose logs -f

# Статус контейнеров
docker-compose ps

# Перезапуск
docker-compose restart
```

## 🔄 Обновление приложения

### Обычное развертывание
```bash
# Останавливаем приложение
pm2 stop samair-st

# Обновляем код
git pull origin main

# Устанавливаем новые зависимости
npm install

# Пересобираем
npm run build

# Запускаем приложение
pm2 start samair-st
```

### Docker развертывание
```bash
# Останавливаем контейнеры
docker-compose down

# Обновляем код
git pull origin main

# Пересобираем образ
docker-compose build

# Запускаем
docker-compose up -d
```

## 🔐 Безопасность

### 1. Настройка файервола
```bash
# Закрываем прямой доступ к Node.js порту
sudo ufw deny 3001

# Разрешаем только через Nginx
sudo ufw allow 'Nginx Full'
```

### 2. Настройка системных лимитов
```bash
# Увеличиваем лимиты для Node.js
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### 3. Автоматические обновления безопасности
```bash
# Устанавливаем unattended-upgrades
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📊 Мониторинг

### Настройка логирования
```bash
# Настройка logrotate для PM2
sudo cat > /etc/logrotate.d/pm2 << 'EOF'
/home/ubuntu/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        /usr/bin/pm2 reloadLogs
    endscript
}
EOF
```

### Мониторинг дискового пространства
```bash
# Создаем скрипт мониторинга
cat > ~/disk_monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df / | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{print $5}' | sed 's/%//g')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "Disk usage is above $THRESHOLD%: $USAGE%" | mail -s "Disk Space Alert" admin@your-domain.com
fi
EOF

# Добавляем в crontab
chmod +x ~/disk_monitor.sh
(crontab -l ; echo "0 */6 * * * ~/disk_monitor.sh") | crontab -
```

## 🚨 Устранение неполадок

### Проблемы с производительностью
```bash
# Увеличиваем memory limit для PM2
pm2 start ecosystem.config.js --max-memory-restart 2G

# Мониторинг использования ресурсов
htop
iotop
```

### Проблемы с подключением к почте
1. Проверьте настройки брандмауэра
2. Убедитесь в правильности IMAP настроек
3. Проверьте логи: `pm2 logs samair-st`

### Резервное копирование
```bash
# Создаем скрипт backup
cat > ~/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf ~/backups/samair-st_$DATE.tar.gz ~/samair-st/server/data
# Сохраняем только последние 7 дней
find ~/backups -name "samair-st_*.tar.gz" -mtime +7 -delete
EOF

# Настраиваем ежедневный backup
mkdir -p ~/backups
chmod +x ~/backup.sh
(crontab -l ; echo "0 2 * * * ~/backup.sh") | crontab -
```

## 📞 Поддержка

При проблемах с развертыванием:
1. Проверьте логи: `pm2 logs` или `docker-compose logs`
2. Убедитесь в правильности настроек портов и брандмауэра
3. Проверьте доступность домена и SSL сертификатов
4. Обратитесь к разделу устранения неполадок в README.md 