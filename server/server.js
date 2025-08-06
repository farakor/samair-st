require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const emailService = require('./services/emailService');
const fileProcessor = require('./services/fileProcessor');
const { initDatabase, testConnection, query } = require('./config/database');
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

// API для настройки SMTP
app.get('/api/smtp-config', (req, res) => {
  try {
    const configPath = path.join(configDir, 'smtp.json');
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
    res.status(500).json({ error: 'Ошибка при загрузке SMTP настроек' });
  }
});

app.post('/api/smtp-config', (req, res) => {
  try {
    const config = req.body;
    emailService.saveSMTPConfig(config);
    res.json({ success: true, message: 'SMTP настройки сохранены' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при сохранении SMTP настроек' });
  }
});

// API для тестирования SMTP подключения
app.post('/api/test-smtp-connection', async (req, res) => {
  try {
    const config = req.body;
    const result = await emailService.testSMTPConnection(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API для отправки приветственного письма
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { userEmail, userName, password } = req.body;
    
    if (!userEmail || !userName || !password) {
      return res.status(400).json({ 
        error: 'Не все обязательные поля переданы (userEmail, userName, password)' 
      });
    }

    const result = await emailService.sendWelcomeEmail(userEmail, userName, password);
    res.json(result);
  } catch (error) {
    console.error('Ошибка отправки приветственного письма:', error);
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
    // Получаем файлы из базы данных
    const allFiles = await databaseService.getAllFiles();
    
    // Фильтруем только файлы из почты и преобразуем формат
    const emailFiles = allFiles
      .filter(file => file.source === 'email')
      .map(file => {
        // Безопасная обработка даты
        let processedAt;
        try {
          if (file.uploadedAt && !isNaN(file.uploadedAt)) {
            processedAt = new Date(file.uploadedAt).toISOString();
          } else {
            processedAt = new Date().toISOString(); // fallback на текущую дату
          }
        } catch (dateError) {
          processedAt = new Date().toISOString();
        }
        
        return {
          id: file.id,
          originalName: file.fileName,
          size: file.size,
          emailFrom: (file.author || '').replace('📧 ', '') || 'Неизвестно',
          emailSubject: file.emailSubject || 'Без темы',
          emailDate: file.emailDate || file.date,
          processedAt: processedAt,
          status: file.status || 'completed',
          flightsCount: file.flightsCount || 0,
          error: file.error
        };
      });
    
    res.json(emailFiles);
  } catch (error) {
    console.error('Ошибка при получении файлов из почты:', error);
    res.status(500).json({ error: 'Ошибка при получении файлов из почты' });
  }
});

// API для ручного получения новых писем из почты
app.post('/api/fetch-emails-manual', async (req, res) => {
  try {
    console.log('Запуск ручного получения писем из почты...');
    
    const result = await emailService.fetchEmailsWithAttachments();
    
    // Подсчитываем новые и существующие файлы
    const newFiles = result.processedFiles.filter(f => f.isNew).length;
    const existingFiles = result.processedFiles.filter(f => !f.isNew).length;
    
    let message = `Получено ${result.totalEmails} писем`;
    if (newFiles > 0) {
      message += `, обработано ${newFiles} новых файлов`;
    }
    if (existingFiles > 0) {
      message += `, найдено ${existingFiles} уже существующих файлов`;
    }
    if (newFiles === 0 && existingFiles === 0) {
      message += ', файлы с вложениями не найдены';
    }
    
    // Обновляем статус после ручного запуска
    try {
      const statusPath = path.join(configDir, 'email-status.json');
      const currentStatus = fs.existsSync(statusPath) ? fs.readJsonSync(statusPath) : {};
      const updatedStatus = {
        ...currentStatus,
        isEnabled: true,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        totalEmails: (currentStatus.totalEmails || 0) + (result.totalEmails || 0),
        totalFiles: (currentStatus.totalFiles || 0) + newFiles
      };
      fs.writeJsonSync(statusPath, updatedStatus, { spaces: 2 });
      console.log('✅ Статус обновлен после ручного запуска');
    } catch (statusError) {
      console.error('❌ Ошибка обновления статуса:', statusError);
    }
    
    res.json({
      success: true,
      message: message,
      data: result
    });
  } catch (error) {
    console.error('Ошибка при ручном получении писем:', error);
    
    // Обновляем статус с ошибкой при ручном запуске
    try {
      const statusPath = path.join(configDir, 'email-status.json');
      const currentStatus = fs.existsSync(statusPath) ? fs.readJsonSync(statusPath) : {};
      const errorStatus = {
        ...currentStatus,
        isEnabled: true,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastError: error.message
      };
      fs.writeJsonSync(statusPath, errorStatus, { spaces: 2 });
    } catch (statusError) {
      console.error('Ошибка обновления статуса:', statusError);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Ошибка при получении писем из почты',
      details: error.message 
    });
  }
});

// API для диагностики базы данных
app.get('/api/database-diagnostics', async (req, res) => {
  try {
    console.log('🔍 Запуск диагностики базы данных...');
    
    // Проверяем подключение к базе данных
    const connectionTest = await query('SELECT NOW()');
    
    // Проверяем существование таблиц
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('uploaded_files', 'flight_data')
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    // Получаем статистику
    const [filesCount, flightsCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM uploaded_files'),
      query('SELECT COUNT(*) as count FROM flight_data')
    ]);
    
    // Получаем примеры данных
    const [sampleFiles, sampleFlights] = await Promise.all([
      query('SELECT * FROM uploaded_files ORDER BY created_at DESC LIMIT 5'),
      query('SELECT * FROM flight_data ORDER BY created_at DESC LIMIT 5')
    ]);
    
    // Получаем статистику по источникам
    const sourceStats = await query(`
      SELECT source, COUNT(*) as count 
      FROM uploaded_files 
      GROUP BY source
    `);
    
    const flightSourceStats = await query(`
      SELECT source, COUNT(*) as count 
      FROM flight_data 
      GROUP BY source
    `);
    
    const diagnostics = {
      database: {
        connected: true,
        connectionTime: connectionTest.rows[0],
        tables: existingTables,
        allTablesExist: existingTables.includes('uploaded_files') && existingTables.includes('flight_data')
      },
      statistics: {
        totalFiles: parseInt(filesCount.rows[0].count),
        totalFlights: parseInt(flightsCount.rows[0].count),
        filesBySource: sourceStats.rows.reduce((acc, row) => {
          acc[row.source] = parseInt(row.count);
          return acc;
        }, {}),
        flightsBySource: flightSourceStats.rows.reduce((acc, row) => {
          acc[row.source] = parseInt(row.count);
          return acc;
        }, {})
      },
      samples: {
        recentFiles: sampleFiles.rows.map(file => ({
          id: file.file_id,
          fileName: file.file_name,
          source: file.source,
          status: file.status,
          flightsCount: file.flights_count,
          createdAt: file.created_at
        })),
        recentFlights: sampleFlights.rows.map(flight => ({
          id: flight.flight_id,
          number: flight.number,
          date: flight.date,
          departure: flight.departure,
          arrival: flight.arrival,
          source: flight.source,
          sourceFile: flight.source_file,
          createdAt: flight.created_at
        }))
      }
    };
    
    console.log('✅ Диагностика базы данных завершена');
    res.json({
      success: true,
      data: diagnostics
    });
    
  } catch (error) {
    console.error('❌ Ошибка диагностики базы данных:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при диагностике базы данных',
      details: error.message,
      database: {
        connected: false
      }
    });
  }
});

// Функция для инициализации статуса автоматического сбора
const initializeEmailStatus = () => {
  try {
    const statusPath = path.join(configDir, 'email-status.json');
    
    if (!fs.existsSync(statusPath)) {
      console.log('🔧 Инициализация статуса автоматического сбора...');
      const initialStatus = {
        isEnabled: true,
        lastRun: null,
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        totalEmails: 0,
        totalFiles: 0
      };
      fs.writeJsonSync(statusPath, initialStatus, { spaces: 2 });
      console.log('✅ Статус автоматического сбора инициализирован');
    } else {
      // Обновляем время следующего запуска при старте сервера
      const currentStatus = fs.readJsonSync(statusPath);
      currentStatus.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      currentStatus.isEnabled = true;
      fs.writeJsonSync(statusPath, currentStatus, { spaces: 2 });
      console.log('✅ Статус автоматического сбора обновлен');
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации статуса:', error);
  }
};

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
    
    // Обновляем статус с ошибкой
    try {
      const statusPath = path.join(configDir, 'email-status.json');
      const currentStatus = fs.existsSync(statusPath) ? fs.readJsonSync(statusPath) : {};
      const errorStatus = {
        ...currentStatus,
        isEnabled: true,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastError: error.message,
        totalEmails: currentStatus.totalEmails || 0,
        totalFiles: currentStatus.totalFiles || 0
      };
      fs.writeJsonSync(statusPath, errorStatus, { spaces: 2 });
    } catch (statusError) {
      console.error('Ошибка обновления статуса:', statusError);
    }
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

// API для синхронизации файлов из файловой системы в PostgreSQL
app.post('/api/sync-files-to-db', async (req, res) => {
  try {
    console.log('🔄 Запуск синхронизации файлов в PostgreSQL...');
    
    // Получаем файлы из файловой системы
    const emailFiles = await emailService.getEmailFiles();
    console.log(`📁 Найдено файлов в файловой системе: ${emailFiles.length}`);
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const fileMetadata of emailFiles) {
      try {
        // Проверяем, есть ли файл в PostgreSQL
        const existingFile = await databaseService.getFileByName(fileMetadata.originalName);
        
        if (!existingFile) {
          // Создаем объект файла в формате для PostgreSQL
          const fileInfo = {
            id: Date.now() + Math.random() + syncedCount,
            date: new Date(fileMetadata.processedAt).toLocaleDateString('ru-RU'),
            fileName: fileMetadata.originalName,
            size: fileProcessor.formatFileSize(fileMetadata.size),
            author: `📧 ${fileMetadata.emailFrom}`,
            uploadedAt: new Date(fileMetadata.processedAt).getTime(),
            status: fileMetadata.status || 'completed',
            flightsCount: fileMetadata.flightsCount || 0,
            source: 'email',
            emailSubject: fileMetadata.emailSubject,
            emailDate: fileMetadata.emailDate
          };
          
          // Сохраняем в PostgreSQL
          await databaseService.saveFileInfo(fileInfo);
          
          // Если есть данные рейсов, обрабатываем файл заново
          if (fileMetadata.filepath && fs.existsSync(fileMetadata.filepath)) {
            try {
              const flights = await fileProcessor.parseExcelFile(fileMetadata.filepath, fileMetadata.originalName);
              if (flights && flights.length > 0) {
                await databaseService.saveFlightData(flights);
                console.log(`✅ Синхронизирован файл ${fileMetadata.originalName} с ${flights.length} рейсами`);
              }
            } catch (parseError) {
              console.error(`⚠️ Ошибка парсинга файла ${fileMetadata.originalName}:`, parseError);
            }
          }
          
          syncedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Ошибка синхронизации файла ${fileMetadata.originalName}:`, error);
      }
    }
    
    console.log(`✅ Синхронизация завершена: синхронизировано ${syncedCount}, пропущено ${skippedCount}`);
    
    res.json({
      success: true,
      message: `Синхронизация завершена: синхронизировано ${syncedCount}, пропущено ${skippedCount}`,
      data: {
        syncedCount,
        skippedCount,
        totalFiles: emailFiles.length
      }
    });
  } catch (error) {
    console.error('❌ Ошибка синхронизации файлов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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
  
  // Инициализируем статус автоматического сбора
  initializeEmailStatus();
  
  console.log('Планировщик писем настроен на 9:00 каждый день');
});

module.exports = app; 