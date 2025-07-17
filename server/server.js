const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const emailService = require('./services/emailService');
const fileProcessor = require('./services/fileProcessor');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Создаем папки для хранения данных
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const configDir = path.join(dataDir, 'config');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(configDir);

// API для настройки почты
app.get('/api/email-config', (req, res) => {
  try {
    const configPath = path.join(configDir, 'email.json');
    if (fs.existsSync(configPath)) {
      const config = fs.readJsonSync(configPath);
      // Не отправляем пароль обратно
      const safeConfig = { ...config };
      delete safeConfig.password;
      res.json(safeConfig);
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке настроек почты' });
  }
});

app.post('/api/email-config', (req, res) => {
  try {
    const config = req.body;
    const configPath = path.join(configDir, 'email.json');
    fs.writeJsonSync(configPath, config, { spaces: 2 });
    res.json({ success: true, message: 'Настройки почты сохранены' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при сохранении настроек почты' });
  }
});

// API для тестирования подключения к почте
app.post('/api/test-email-connection', async (req, res) => {
  try {
    const config = req.body;
    const result = await emailService.testConnection(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API для ручного получения писем
app.post('/api/fetch-emails-manual', async (req, res) => {
  try {
    const result = await emailService.fetchEmailsWithAttachments();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API для получения логов почты
app.get('/api/email-logs', (req, res) => {
  try {
    const logsPath = path.join(configDir, 'email-logs.json');
    if (fs.existsSync(logsPath)) {
      const logs = fs.readJsonSync(logsPath);
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке логов' });
  }
});

// API для получения статуса автоматического сбора
app.get('/api/email-status', (req, res) => {
  try {
    const statusPath = path.join(configDir, 'email-status.json');
    if (fs.existsSync(statusPath)) {
      const status = fs.readJsonSync(statusPath);
      res.json(status);
    } else {
      res.json({ 
        isEnabled: false,
        lastRun: null,
        nextRun: null,
        totalEmails: 0,
        totalFiles: 0
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке статуса' });
  }
});

// API для получения обработанных файлов из почты
app.get('/api/email-files', async (req, res) => {
  try {
    const processedFiles = await fileProcessor.getProcessedEmailFiles();
    res.json(processedFiles);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении файлов из почты' });
  }
});

// Планировщик для ежедневного получения писем (каждый день в 9:00)
cron.schedule('0 9 * * *', async () => {
  console.log('Запуск автоматического получения писем...');
  try {
    const result = await emailService.fetchEmailsWithAttachments();
    console.log('Автоматическое получение писем завершено:', result);
    
    // Обновляем статус
    const statusPath = path.join(configDir, 'email-status.json');
    const status = {
      isEnabled: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      totalEmails: result.totalEmails || 0,
      totalFiles: result.totalFiles || 0
    };
    fs.writeJsonSync(statusPath, status, { spaces: 2 });
  } catch (error) {
    console.error('Ошибка при автоматическом получении писем:', error);
  }
});

// Обслуживание статических файлов React приложения
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log('Планировщик писем настроен на 9:00 каждый день');
});

module.exports = app; 