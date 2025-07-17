const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs-extra');
const path = require('path');

class EmailService {
  constructor() {
    this.configDir = path.join(__dirname, '../data/config');
    this.uploadsDir = path.join(__dirname, '../data/uploads');
    
    fs.ensureDirSync(this.configDir);
    fs.ensureDirSync(this.uploadsDir);
  }

  // Загрузка конфигурации почты
  loadEmailConfig() {
    const configPath = path.join(this.configDir, 'email.json');
    if (fs.existsSync(configPath)) {
      return fs.readJsonSync(configPath);
    }
    throw new Error('Конфигурация почты не найдена. Настройте подключение к почте.');
  }

  // Сохранение лога
  async saveLog(logEntry) {
    const logsPath = path.join(this.configDir, 'email-logs.json');
    let logs = [];
    
    if (fs.existsSync(logsPath)) {
      logs = fs.readJsonSync(logsPath);
    }
    
    logs.unshift({
      ...logEntry,
      timestamp: new Date().toISOString()
    });
    
    // Оставляем только последние 100 записей
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    
    fs.writeJsonSync(logsPath, logs, { spaces: 2 });
  }

  // Тестирование подключения к почте
  async testConnection(config) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port || 993,
        tls: config.tls !== false,
        tlsOptions: { rejectUnauthorized: false }
      });

      let connected = false;

      imap.once('ready', () => {
        connected = true;
        imap.end();
        resolve({ 
          success: true, 
          message: 'Подключение к почте прошло успешно' 
        });
      });

      imap.once('error', (err) => {
        if (!connected) {
          reject(new Error(`Ошибка подключения к почте: ${err.message}`));
        }
      });

      imap.once('end', () => {
        if (!connected) {
          reject(new Error('Подключение к почте было закрыто неожиданно'));
        }
      });

      try {
        imap.connect();
      } catch (error) {
        reject(new Error(`Ошибка при подключении: ${error.message}`));
      }
    });
  }

  // Получение писем с вложениями
  async fetchEmailsWithAttachments() {
    const config = this.loadEmailConfig();
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port || 993,
        tls: config.tls !== false,
        tlsOptions: { rejectUnauthorized: false }
      });

      let results = {
        totalEmails: 0,
        totalFiles: 0,
        processedFiles: [],
        errors: []
      };

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            this.saveLog({
              type: 'error',
              message: 'Ошибка при открытии почтового ящика',
              error: err.message
            });
            return reject(err);
          }

          // Ищем письма за последние 7 дней с вложениями
          const date = new Date();
          date.setDate(date.getDate() - 7);
          const searchCriteria = [
            ['SINCE', date],
            ['HEADER', 'Content-Type', 'multipart']
          ];

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              this.saveLog({
                type: 'error',
                message: 'Ошибка при поиске писем',
                error: err.message
              });
              return reject(err);
            }

            if (results.length === 0) {
              this.saveLog({
                type: 'info',
                message: 'Новые письма с вложениями не найдены'
              });
              imap.end();
              return resolve({
                totalEmails: 0,
                totalFiles: 0,
                processedFiles: [],
                errors: []
              });
            }

            this.processEmails(imap, results, resolve, reject);
          });
        });
      });

      imap.once('error', (err) => {
        this.saveLog({
          type: 'error',
          message: 'Ошибка IMAP подключения',
          error: err.message
        });
        reject(err);
      });

      imap.once('end', () => {
        console.log('IMAP соединение закрыто');
      });

      imap.connect();
    });
  }

  // Обработка найденных писем
  async processEmails(imap, messageIds, resolve, reject) {
    let processedCount = 0;
    let results = {
      totalEmails: messageIds.length,
      totalFiles: 0,
      processedFiles: [],
      errors: []
    };

    const fetch = imap.fetch(messageIds, { bodies: '' });

    fetch.on('message', (msg, seqno) => {
      msg.on('body', (stream, info) => {
        let buffer = '';
        
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
        });

        stream.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer);
            
            if (parsed.attachments && parsed.attachments.length > 0) {
              for (const attachment of parsed.attachments) {
                if (this.isExcelFile(attachment.filename)) {
                  try {
                    await this.saveAttachment(attachment, parsed);
                    results.totalFiles++;
                    results.processedFiles.push({
                      filename: attachment.filename,
                      size: attachment.size,
                      from: parsed.from?.text || 'Неизвестно',
                      subject: parsed.subject || 'Без темы',
                      date: parsed.date || new Date()
                    });
                  } catch (error) {
                    results.errors.push({
                      filename: attachment.filename,
                      error: error.message
                    });
                  }
                }
              }
            }
          } catch (error) {
            results.errors.push({
              message: `Ошибка обработки письма ${seqno}`,
              error: error.message
            });
          }
        });
      });
    });

    fetch.once('error', (err) => {
      this.saveLog({
        type: 'error',
        message: 'Ошибка при получении писем',
        error: err.message
      });
      reject(err);
    });

    fetch.once('end', () => {
      imap.end();
      
      this.saveLog({
        type: 'success',
        message: `Обработано писем: ${results.totalEmails}, найдено файлов: ${results.totalFiles}`,
        details: results
      });

      resolve(results);
    });
  }

  // Проверка, является ли файл Excel файлом
  isExcelFile(filename) {
    if (!filename) return false;
    
    const ext = path.extname(filename).toLowerCase();
    return ext === '.xls' || ext === '.xlsx';
  }

  // Сохранение вложения
  async saveAttachment(attachment, emailInfo) {
    const filename = `${Date.now()}_${attachment.filename}`;
    const filepath = path.join(this.uploadsDir, filename);
    
    await fs.writeFile(filepath, attachment.content);
    
    // Сохраняем метаданные о файле
    const metadata = {
      originalName: attachment.filename,
      filename: filename,
      filepath: filepath,
      size: attachment.size,
      emailFrom: emailInfo.from?.text || 'Неизвестно',
      emailSubject: emailInfo.subject || 'Без темы',
      emailDate: emailInfo.date || new Date(),
      processedAt: new Date().toISOString(),
      source: 'email'
    };

    const metadataPath = path.join(this.uploadsDir, `${filename}.meta.json`);
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    return metadata;
  }

  // Получение списка файлов из email
  async getEmailFiles() {
    const files = await fs.readdir(this.uploadsDir);
    const emailFiles = [];

    for (const file of files) {
      if (file.endsWith('.meta.json')) {
        try {
          const metadataPath = path.join(this.uploadsDir, file);
          const metadata = await fs.readJson(metadataPath);
          
          if (metadata.source === 'email') {
            emailFiles.push(metadata);
          }
        } catch (error) {
          console.error(`Ошибка при чтении метаданных файла ${file}:`, error);
        }
      }
    }

    return emailFiles.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
  }
}

module.exports = new EmailService(); 