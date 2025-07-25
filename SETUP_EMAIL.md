# Настройка автоматического получения XLS файлов из почты

## Обзор

Система теперь поддерживает два способа загрузки данных:
1. **Ручная загрузка** - загрузка файлов через веб-интерфейс (как раньше)
2. **Автоматическая загрузка** - получение XLS файлов из почты каждый день

## Установка зависимостей

```bash
npm install
```

## Запуск системы

Теперь система состоит из двух частей: frontend (React) и backend (Express.js).

### Запуск в режиме разработки
```bash
# Запуск и frontend и backend одновременно
npm run dev
```

### Запуск отдельно
```bash
# Backend (Express сервер)
npm run server

# Frontend (React приложение)
npm start
```

## Настройка почты

### 1. Войдите в админку
- Откройте приложение в браузере
- Войдите с правами администратора или пользователя с доступом к загрузке данных

### 2. Перейдите в "Настройки почты"
- В боковом меню выберите "Настройки почты"

### 3. Заполните настройки IMAP

#### Для Gmail:
- **Сервер IMAP**: `imap.gmail.com`
- **Порт**: `993`
- **Email адрес**: ваш Gmail адрес
- **Пароль**: пароль приложения (НЕ основной пароль!)
- **TLS/SSL**: включен

#### Для Yandex:
- **Сервер IMAP**: `imap.yandex.ru`
- **Порт**: `993`
- **Email адрес**: ваш Yandex адрес
- **Пароль**: пароль от почты
- **TLS/SSL**: включен

#### Для Outlook/Office365:
- **Сервер IMAP**: `outlook.office365.com`
- **Порт**: `993`
- **Email адрес**: ваш Outlook адрес
- **Пароль**: пароль от почты
- **TLS/SSL**: включен

### 4. Тестирование
- Нажмите "Тестировать подключение"
- Убедитесь, что подключение прошло успешно
- Сохраните настройки

## Настройка Gmail (важно!)

Для работы с Gmail необходимо:

1. **Включить двухфакторную аутентификацию**
2. **Создать пароль приложения**:
   - Перейдите в настройки Google аккаунта
   - Безопасность → Пароли приложений
   - Создайте новый пароль для "Почта"
   - Используйте этот пароль в настройках системы

## Как это работает

### Автоматический режим
- **Время запуска**: каждый день в 9:00 утра
- **Поиск писем**: за последние 7 дней
- **Обработка**: только письма с XLS/XLSX вложениями
- **Результат**: файлы автоматически добавляются в систему

### Ручной запуск
- Перейдите в "Логи почты"
- Нажмите "Запустить вручную"
- Дождитесь завершения обработки

## Просмотр результатов

### В разделе "Загрузка данных"
- Файлы из почты помечены иконкой 📧
- Файлы ручной загрузки помечены иконкой ⬆️
- Показывается автор письма и тема

### В разделе "Логи почты"
- История всех операций
- Статистика обработки
- Детали ошибок (если есть)

## Структура файлов

```
samair-st/
├── server/                    # Backend Express.js
│   ├── server.js             # Основной сервер
│   ├── services/
│   │   ├── emailService.js   # Сервис работы с почтой
│   │   └── fileProcessor.js  # Обработка файлов
│   └── data/                 # Данные сервера
│       ├── config/           # Настройки и логи
│       └── uploads/          # Файлы из почты
├── src/                      # Frontend React
│   ├── components/
│   │   ├── EmailSettings.jsx # Настройки почты
│   │   └── EmailLogs.jsx     # Логи почты
│   └── ...
└── package.json              # Зависимости
```

## Безопасность

- Пароли хранятся локально в зашифрованном виде
- Подключение к почте через защищенный TLS/SSL
- Обрабатываются только XLS/XLSX файлы
- Логи ведутся для аудита всех операций

## Устранение неполадок

### Ошибка подключения к почте
1. Проверьте настройки IMAP
2. Убедитесь, что IMAP включен в почтовом клиенте
3. Для Gmail используйте пароль приложения
4. Проверьте брандмауэр и антивирус

### Файлы не обрабатываются
1. Убедитесь, что файлы имеют расширение .xls или .xlsx
2. Проверьте структуру Excel файла (должна соответствовать шаблону)
3. Посмотрите детали ошибок в логах

### Backend не запускается
1. Убедитесь, что порт 3001 свободен
2. Проверьте установку зависимостей: `npm install`
3. Посмотрите логи сервера в консоли

## Контакты

При возникновении проблем обратитесь к администратору системы. 