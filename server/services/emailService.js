const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
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

  // Загрузка SMTP конфигурации
  loadSMTPConfig() {
    const configPath = path.join(this.configDir, 'smtp.json');
    if (fs.existsSync(configPath)) {
      return fs.readJsonSync(configPath);
    }
    throw new Error('SMTP конфигурация не найдена. Настройте SMTP подключение.');
  }

  // Сохранение SMTP конфигурации
  saveSMTPConfig(config) {
    const configPath = path.join(this.configDir, 'smtp.json');
    fs.writeJsonSync(configPath, config, { spaces: 2 });
  }

  // Создание SMTP транспорта
  createSMTPTransporter(config = null) {
    const smtpConfig = config || this.loadSMTPConfig();
    
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure, // true для 465, false для других портов
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
      tls: {
        rejectUnauthorized: false // для самоподписанных сертификатов
      }
    });
  }

  // Тестирование SMTP соединения
  async testSMTPConnection(config) {
    try {
      const transporter = this.createSMTPTransporter(config);
      await transporter.verify();
      
      await this.saveLog({
        type: 'success',
        message: 'SMTP подключение протестировано успешно'
      });

      return { 
        success: true, 
        message: 'SMTP подключение прошло успешно' 
      };
    } catch (error) {
      console.error('SMTP ошибка:', error);
      
      await this.saveLog({
        type: 'error',
        message: 'Ошибка тестирования SMTP подключения',
        error: error.message
      });

      throw new Error(`Ошибка SMTP подключения: ${error.message}`);
    }
  }

  // Загрузка HTML шаблона для приветственного письма
  loadEmailTemplate() {
    const templatePath = path.join(__dirname, '../../email-temp/welcome_user_template.html');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8');
    }
    throw new Error(`HTML шаблон письма не найден по пути: ${templatePath}`);
  }

  // Загрузка HTML шаблона для сброса пароля
  loadPasswordResetTemplate() {
    const templatePath = path.join(__dirname, '../../email-temp/password_reset_template.html');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8');
    }
    throw new Error(`HTML шаблон сброса пароля не найден по пути: ${templatePath}`);
  }

  // Отправка письма с паролем новому пользователю
  async sendWelcomeEmail(userEmail, userName, password) {
    try {
      const transporter = this.createSMTPTransporter();
      const smtpConfig = this.loadSMTPConfig();

      // Загружаем HTML шаблон и заменяем переменные
      let htmlTemplate = this.loadEmailTemplate();
      htmlTemplate = htmlTemplate.replace(/{{userName}}/g, userName);
      htmlTemplate = htmlTemplate.replace(/{{userEmail}}/g, userEmail);
      htmlTemplate = htmlTemplate.replace(/{{password}}/g, password);

      const mailOptions = {
        from: `"${smtpConfig.fromName || 'Air Samarkand System'}" <${smtpConfig.user}>`,
        to: userEmail,
        subject: 'Добро пожаловать в систему Air Samarkand',
        html: htmlTemplate,
        attachments: [
          {
            filename: 'air-samarkand-logo.png',
            path: path.join(__dirname, '../../email-temp/images/air-samarkand-logo.png'),
            cid: 'air-samarkand-logo'
          },
          {
            filename: 'person-24-light.png',
            path: path.join(__dirname, '../../email-temp/images/person-24-light.png'),
            cid: 'person-24-light'
          },
          {
            filename: 'vpn_key-48-primary.png',
            path: path.join(__dirname, '../../email-temp/images/vpn_key-48-primary.png'),
            cid: 'vpn_key-48-primary'
          }
        ]
      };

      const result = await transporter.sendMail(mailOptions);
      
      await this.saveLog({
        type: 'success',
        message: `Приветственное письмо отправлено пользователю ${userName} (${userEmail})`,
        details: {
          to: userEmail,
          messageId: result.messageId
        }
      });

      return { 
        success: true, 
        message: 'Письмо с паролем отправлено успешно',
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Ошибка отправки приветственного письма:', error);
      
      await this.saveLog({
        type: 'error',
        message: `Ошибка отправки приветственного письма пользователю ${userName} (${userEmail})`,
        error: error.message
      });

      throw new Error(`Ошибка отправки письма: ${error.message}`);
    }
  }

  // Отправка письма со сброшенным паролем
  async sendPasswordResetEmail(userEmail, userName, newPassword) {
    try {
      const transporter = this.createSMTPTransporter();
      const smtpConfig = this.loadSMTPConfig();

      // Загружаем HTML шаблон для сброса пароля и заменяем переменные
      let htmlTemplate = this.loadPasswordResetTemplate();
      htmlTemplate = htmlTemplate.replace(/{{userName}}/g, userName);
      htmlTemplate = htmlTemplate.replace(/{{userEmail}}/g, userEmail);
      htmlTemplate = htmlTemplate.replace(/{{password}}/g, newPassword);

      const mailOptions = {
        from: `"${smtpConfig.fromName || 'Air Samarkand System'}" <${smtpConfig.user}>`,
        to: userEmail,
        subject: 'Пароль сброшен - Air Samarkand',
        html: htmlTemplate,
        attachments: [
          {
            filename: 'air-samarkand-logo.png',
            path: path.join(__dirname, '../../email-temp/images/air-samarkand-logo.png'),
            cid: 'air-samarkand-logo'
          },
          {
            filename: 'vpn_key-48-primary.png',
            path: path.join(__dirname, '../../email-temp/images/vpn_key-48-primary.png'),
            cid: 'vpn_key-48-primary'
          }
        ]
      };

      const result = await transporter.sendMail(mailOptions);
      
      await this.saveLog({
        type: 'success',
        message: `Письмо со сброшенным паролем отправлено пользователю ${userName} (${userEmail})`,
        details: {
          to: userEmail,
          messageId: result.messageId
        }
      });

      return { 
        success: true, 
        message: 'Письмо со сброшенным паролем отправлено успешно',
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Ошибка отправки письма со сброшенным паролем:', error);
      
      await this.saveLog({
        type: 'error',
        message: `Ошибка отправки письма со сброшенным паролем пользователю ${userName} (${userEmail})`,
        error: error.message
      });

      throw new Error(`Ошибка отправки письма: ${error.message}`);
    }
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
      const imapConfig = {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port || 993,
        tls: config.tls !== false,
        tlsOptions: { rejectUnauthorized: false },
        // Добавляем дополнительные опции для лучшей совместимости
        connTimeout: 10000, // 10 секунд timeout
        authTimeout: 5000,  // 5 секунд timeout для аутентификации
        keepalive: false
      };

      console.log('Попытка подключения с настройками:', {
        host: imapConfig.host,
        port: imapConfig.port,
        user: imapConfig.user,
        tls: imapConfig.tls
      });

      const imap = new Imap(imapConfig);

      let connected = false;
      let authFailed = false;

      imap.once('ready', () => {
        connected = true;
        console.log('IMAP подключение успешно');
        imap.end();
        resolve({ 
          success: true, 
          message: 'Подключение к почте прошло успешно' 
        });
      });

      imap.once('error', (err) => {
        console.error('IMAP ошибка:', err);
        if (!connected) {
          if (err.message.includes('Authentication failed') || err.message.includes('Invalid credentials')) {
            authFailed = true;
            reject(new Error(`Ошибка аутентификации: Неверный логин или пароль. Проверьте учетные данные.`));
          } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
            reject(new Error(`Ошибка подключения: Не удается подключиться к серверу ${config.host}:${config.port}. Проверьте настройки сервера.`));
          } else if (err.message.includes('timeout')) {
            reject(new Error(`Ошибка подключения: Превышено время ожидания. Проверьте настройки сервера и интернет-соединение.`));
          } else {
            reject(new Error(`Ошибка подключения к почте: ${err.message}`));
          }
        }
      });

      imap.once('end', () => {
        console.log('IMAP соединение закрыто');
        if (!connected && !authFailed) {
          reject(new Error('Подключение к почте было закрыто неожиданно'));
        }
      });

      try {
        imap.connect();
      } catch (error) {
        console.error('Ошибка при инициализации подключения:', error);
        reject(new Error(`Ошибка при подключении: ${error.message}`));
      }

      // Добавляем общий timeout
      setTimeout(() => {
        if (!connected && !authFailed) {
          imap.destroy();
          reject(new Error('Превышено время ожидания подключения (10 секунд)'));
        }
      }, 10000);
    });
  }

  // Получение писем с вложениями
  async fetchEmailsWithAttachments() {
    const config = this.loadEmailConfig();
    
    return new Promise((resolve, reject) => {
      console.log('📧 Создание Promise для получения писем...');
      
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
        console.log('📧 IMAP готов, открываем почтовый ящик...');
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('❌ Ошибка при открытии почтового ящика:', err);
            this.saveLog({
              type: 'error',
              message: 'Ошибка при открытии почтового ящика',
              error: err.message
            });
            return reject(err);
          }

          console.log('📧 Почтовый ящик открыт, начинаем поиск...');
          
          // Ищем письма за последние 30 дней с вложениями
          const date = new Date();
          date.setDate(date.getDate() - 30);
          
          console.log(`📧 Поиск писем с ${date.toISOString()} с вложениями...`);
          
          const searchCriteria = [
            ['SINCE', date],
            ['HEADER', 'Content-Type', 'multipart']
          ];

          imap.search(searchCriteria, (err, searchResults) => {
            if (err) {
              console.error('❌ Ошибка при поиске писем:', err);
              this.saveLog({
                type: 'error',
                message: 'Ошибка при поиске писем',
                error: err.message
              });
              return reject(err);
            }

            console.log(`📧 Найдено ${searchResults.length} писем с вложениями`);

            if (searchResults.length === 0) {
              console.log('📧 Писем не найдено, завершаем с пустым результатом');
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

            console.log('📧 Запускаем обработку найденных писем...');
            this.processEmails(imap, searchResults, resolve, reject);
          });
        });
      });

      imap.once('error', (err) => {
        console.error('❌ IMAP ошибка:', err);
        this.saveLog({
          type: 'error',
          message: 'Ошибка IMAP подключения',
          error: err.message
        });
        reject(err);
      });

      imap.once('end', () => {
        console.log('📧 IMAP соединение закрыто');
      });

      console.log('📧 Подключаемся к IMAP серверу...');
      imap.connect();
    });
  }

  // Обработка найденных писем
  async processEmails(imap, messageIds, resolve, reject) {
    console.log(`🔄 Начинаем обработку ${messageIds.length} писем...`);
    
    let results = {
      totalEmails: messageIds.length,
      totalFiles: 0,
      processedFiles: [],
      errors: []
    };

    const fetch = imap.fetch(messageIds, { bodies: '' });
    let processedCount = 0;

    console.log('🔄 Создаем fetch для получения содержимого писем...');

    fetch.on('message', (msg, seqno) => {
      console.log(`📨 Получаем письмо #${seqno}...`);
      
      msg.on('body', (stream, info) => {
        let buffer = '';
        
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
        });

        stream.once('end', async () => {
          console.log(`📨 Обработка содержимого письма #${seqno}...`);
          
          try {
            const parsed = await simpleParser(buffer);
            
            console.log(`Обрабатываем письмо от: ${parsed.from?.text}, тема: ${parsed.subject}`);
            console.log(`Вложений найдено: ${parsed.attachments?.length || 0}`);
            
            if (parsed.attachments && parsed.attachments.length > 0) {
              for (const attachment of parsed.attachments) {
                console.log(`Проверяем вложение: ${attachment.filename}, размер: ${attachment.size}`);
                
                if (this.isExcelFile(attachment.filename)) {
                  console.log(`Файл ${attachment.filename} является Excel файлом, обрабатываем...`);
                  
                  try {
                    const savedFile = await this.saveAttachment(attachment, parsed);
                    
                    // Считаем файл обработанным только если он был реально сохранен (новый)
                    if (savedFile) {
                      results.totalFiles++;
                      results.processedFiles.push({
                        filename: attachment.filename,
                        size: attachment.size,
                        from: parsed.from?.text || 'Неизвестно',
                        subject: parsed.subject || 'Без темы',
                        date: parsed.date || new Date(),
                        isNew: true
                      });
                      console.log(`✅ Новый файл сохранен: ${attachment.filename}`);
                    } else {
                      // Файл уже существовал
                      results.processedFiles.push({
                        filename: attachment.filename,
                        size: attachment.size,
                        from: parsed.from?.text || 'Неизвестно',
                        subject: parsed.subject || 'Без темы',
                        date: parsed.date || new Date(),
                        isNew: false
                      });
                      console.log(`⏭️ Файл уже существует: ${attachment.filename}`);
                    }
                  } catch (error) {
                    console.error('Ошибка при сохранении файла:', error);
                    results.errors.push({
                      filename: attachment.filename,
                      error: error.message
                    });
                  }
                } else {
                  console.log(`Файл ${attachment.filename} не является Excel файлом, пропускаем`);
                }
              }
            }

            // Увеличиваем счетчик обработанных писем
            processedCount++;
            console.log(`✅ Письмо #${seqno} обработано. Обработано ${processedCount}/${messageIds.length}`);

            // Если все письма обработаны, завершаем Promise
            if (processedCount === messageIds.length) {
              console.log(`🎉 Все письма обработаны! Закрываем соединение...`);
              
              imap.end();
              
              // Сохраняем лог
              this.saveLog({
                type: 'success',
                message: `Обработано писем: ${results.totalEmails}, новых файлов: ${results.totalFiles}`,
                timestamp: new Date().toISOString(),
                details: results
              });

              console.log(`🎉 Завершаем Promise с результатами:`, results);
              resolve(results);
            }

          } catch (error) {
            console.error('Ошибка при обработке письма:', error);
            results.errors.push({
              seqno: seqno,
              error: error.message
            });

            // Увеличиваем счетчик даже при ошибке
            processedCount++;
            
            // Если все письма обработаны (включая ошибки), завершаем
            if (processedCount === messageIds.length) {
              console.log(`⚠️ Все письма обработаны с ошибками. Закрываем соединение...`);
              imap.end();
              resolve(results);
            }
          }
        });
      });
    });

    fetch.once('error', (err) => {
      console.error('Ошибка при получении писем:', err);
      imap.end();
      reject(err);
    });

    // Таймаут на случай зависания
    setTimeout(() => {
      console.log('⏰ Таймаут обработки писем');
      if (processedCount < messageIds.length) {
        imap.end();
        reject(new Error('Таймаут обработки писем'));
      }
    }, 30000); // 30 секунд
  }

  // Проверка, является ли файл Excel файлом
  isExcelFile(filename) {
    if (!filename) return false;
    
    const ext = path.extname(filename).toLowerCase();
    return ext === '.xls' || ext === '.xlsx';
  }

  // Сохранение вложения
  async saveAttachment(attachment, emailInfo) {
    // Проверяем, существует ли уже такой файл
    const existingFiles = await this.getEmailFiles();
    const emailDate = emailInfo.date || new Date();
    const emailFrom = emailInfo.from?.text || emailInfo.from || 'Неизвестно';
    const emailSubject = emailInfo.subject || 'Без темы';
    
    // Ищем дублирующийся файл по имени, размеру, отправителю и теме
    // Это позволяет сохранять файлы с одинаковыми именами из разных писем
    const existingFile = existingFiles.find(file => 
      file.originalName === attachment.filename &&
      file.size === attachment.size &&
      file.emailFrom === emailFrom &&
      file.emailSubject === emailSubject
    );
    
    if (existingFile) {
      console.log(`Файл ${attachment.filename} из письма "${emailSubject}" от ${emailFrom} уже существует, пропускаем`);
      return null; // Возвращаем null чтобы указать что файл не был сохранен
    }
    
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
      emailDate: emailDate,
      processedAt: new Date().toISOString(),
      source: 'email'
    };

    const metadataPath = path.join(this.uploadsDir, `${filename}.meta.json`);
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    console.log(`Сохранен новый файл: ${attachment.filename}`);

    // Обрабатываем Excel файл для извлечения данных рейсов
    try {
      console.log(`🔄 Начинаем обработку Excel файла: ${attachment.filename}`);
      const fileProcessor = require('./fileProcessor');
      const processedData = await fileProcessor.processEmailFile(metadata);
      
      if (processedData.success && processedData.flights.length > 0) {
        console.log(`✅ Обработано ${processedData.flights.length} рейсов из файла ${attachment.filename}`);
        metadata.flightsCount = processedData.flights.length;
        metadata.status = 'completed';
      } else {
        console.log(`⚠️ Не удалось извлечь данные рейсов из файла ${attachment.filename}`);
        metadata.flightsCount = 0;
        metadata.status = 'error';
        metadata.error = processedData.error || 'Не удалось извлечь данные рейсов';
      }
      
      // Обновляем метаданные с информацией о количестве рейсов
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
      
    } catch (error) {
      console.error(`❌ Ошибка при обработке файла ${attachment.filename}:`, error);
      metadata.flightsCount = 0;
      metadata.status = 'error';
      metadata.error = error.message;
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    }

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