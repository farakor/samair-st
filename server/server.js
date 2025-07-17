require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const emailService = require('./services/emailService');
const fileProcessor = require('./services/fileProcessor');
const { initDatabase, testConnection } = require('./config/database');
const databaseService = require('./services/databaseService');

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

// API endpoints для работы с базой данных

// Получение всех файлов
app.get('/api/files', async (req, res) => {
  try {
    const files = await databaseService.getAllFiles();
    res.json(files);
  } catch (error) {
    console.error('Ошибка получения файлов:', error);
    res.status(500).json({ error: 'Ошибка получения файлов' });
  }
});

// Получение данных рейсов с фильтрацией
app.get('/api/flight-data', async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      aircraftType: req.query.aircraftType,
      airport: req.query.airport
    };
    
    const flights = await databaseService.getFlightData(filters);
    res.json(flights);
  } catch (error) {
    console.error('Ошибка получения данных рейсов:', error);
    res.status(500).json({ error: 'Ошибка получения данных рейсов' });
  }
});

// Получение статистики
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await databaseService.getFlightStats();
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Удаление файла
app.delete('/api/files/:fileId', async (req, res) => {
  try {
    await databaseService.deleteFile(req.params.fileId);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

// Очистка всех данных
app.delete('/api/clear-all', async (req, res) => {
  try {
    await databaseService.clearAllData();
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка очистки данных:', error);
    res.status(500).json({ error: 'Ошибка очистки данных' });
  }
});

// Сохранение данных рейсов
app.post('/api/flight-data', async (req, res) => {
  try {
    await databaseService.saveFlightData(req.body.flights);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка сохранения данных рейсов:', error);
    res.status(500).json({ error: 'Ошибка сохранения данных рейсов' });
  }
});

// Сохранение информации о файле
app.post('/api/files', async (req, res) => {
  try {
    const savedFile = await databaseService.saveFileInfo(req.body.fileInfo);
    res.json(savedFile);
  } catch (error) {
    console.error('Ошибка сохранения информации о файле:', error);
    res.status(500).json({ error: 'Ошибка сохранения информации о файле' });
  }
});

// Обслуживание статических файлов React приложения
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  
  // Проверяем подключение к базе данных
  const dbConnected = await testConnection();
  if (dbConnected) {
    // Инициализируем базу данных
    await initDatabase();
  } else {
    console.warn('Сервер работает без подключения к PostgreSQL');
  }
  
  console.log('Планировщик писем настроен на 9:00 каждый день');
});

module.exports = app; 