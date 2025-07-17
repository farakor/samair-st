const fs = require('fs-extra');
const path = require('path');
const XLSX = require('xlsx');
const databaseService = require('./databaseService');

class FileProcessor {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../data/uploads');
    fs.ensureDirSync(this.uploadsDir);
  }

  // Функция для конвертации Excel серийного номера даты в обычную дату
  excelSerialDateToJSDate(serial) {
    // Если это уже строка даты, возвращаем как есть
    if (typeof serial === 'string' && isNaN(serial)) {
      return serial;
    }

    // Если это число (серийный номер Excel)
    if (typeof serial === 'number' || !isNaN(serial)) {
      const serialNumber = Number(serial);

      // Excel начинает отсчёт с 1 января 1900 (серийный номер 1)
      // Есть известная ошибка Excel - он считает 1900 год високосным

      // Базовая дата: 1 января 1900 соответствует серийному номеру 1
      let days = serialNumber - 1; // Вычитаем 1, так как 1 января 1900 = серийный номер 1

      // Если серийный номер больше 59 (после 28 февраля 1900), 
      // нужно вычесть ещё 1 день из-за ошибки Excel с 29 февраля 1900
      if (serialNumber > 59) {
        days = days - 1;
      }

      // Создаем дату начиная с 1 января 1900, избегая проблем с часовыми поясами
      const baseDate = new Date(1900, 0, 1); // 1 января 1900 в локальном времени
      const jsDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days);

      // Проверяем, что дата валидна
      if (isNaN(jsDate.getTime())) {
        console.warn('Некорректный серийный номер даты:', serialNumber);
        return serial.toString();
      }

      // Форматируем дату в российском формате, используя компоненты даты напрямую
      const day = jsDate.getDate().toString().padStart(2, '0');
      const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
      const year = jsDate.getFullYear();
      const formattedDate = `${day}.${month}.${year}`;

      console.log(`Конвертация: серийный номер ${serialNumber} → дата ${formattedDate}`);
      return formattedDate;
    }

    return serial;
  }

  // Функция для конвертации времени из Excel формата в читаемый вид
  excelTimeToReadableTime(timeValue) {
    // Если это уже строка времени, возвращаем как есть
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }

    // Если это пустое значение
    if (!timeValue || timeValue === '') {
      return '';
    }

    // Если это число (доля дня в Excel)
    if (typeof timeValue === 'number' || !isNaN(timeValue)) {
      const timeDecimal = Number(timeValue);

      // Конвертируем в общее количество минут (timeDecimal * 24 часа * 60 минут)
      const totalMinutes = Math.round(timeDecimal * 24 * 60);

      // Извлекаем часы и минуты
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Форматируем как HH:MM
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      console.log(`Конвертация времени: ${timeDecimal} → ${formattedTime}`);
      return formattedTime;
    }

    return timeValue.toString();
  }

  // Парсинг Excel файла (аналогично FilesContext)
  async parseExcelFile(filePath, originalName) {
    return new Promise(async (resolve, reject) => {
      console.log(`Начинаем парсинг файла: ${originalName}`);

      try {
        const data = fs.readFileSync(filePath);
        console.log(`Файл прочитан: ${originalName}, размер: ${data.length} байт`);

        const workbook = XLSX.read(data, { type: 'buffer', cellDates: false });
        console.log(`XLSX.read успешно выполнен для файла ${originalName}`);
        console.log(`Найдены листы:`, workbook.SheetNames);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Файл не содержит листов Excel');
        }

        // Берем первый лист
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        console.log(`Обрабатываем лист: ${firstSheetName}`);

        if (!worksheet) {
          throw new Error(`Лист "${firstSheetName}" не найден или поврежден`);
        }

        // Конвертируем в JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('Общее количество строк в файле:', jsonData.length);
        console.log('Первые 5 строк:', jsonData.slice(0, 5));

        if (jsonData.length < 4) {
          console.log(`Файл ${originalName} содержит менее 4 строк, возвращаем пустой массив`);
          resolve([]); // Файл содержит менее 4 строк (недостаточно данных)
          return;
        }

        // Начинаем с 3-й строки (индекс 2) - это заголовки столбцов
        // Данные начинаются с 4-й строки (индекс 3)
        const headerRow = jsonData[2]; // 3-я строка с заголовками
        console.log('Заголовки столбцов:', headerRow);

        const flights = jsonData.slice(3).map((row, index) => {
          if (!row || row.length === 0 || !row[2]) return null; // Пропускаем пустые строки или строки без даты (теперь в колонке C)

          // Конвертируем дату из Excel серийного номера (теперь в колонке C - индекс 2)
          const convertedDate = this.excelSerialDateToJSDate(row[2]);

          return {
            id: `flight_${originalName}_${index}`,
            number: row[1] || '',         // Колонка B - номер рейса
            date: convertedDate,          // Колонка C - дата  
            aircraftType: row[3] || '',   // Колонка D - тип ВС
            departure: row[4] || '',      // Колонка E - вылет
            arrival: row[5] || '',        // Колонка F - прилет
            departureTime: this.excelTimeToReadableTime(row[6]),  // Колонка G - время отпр(факт)
            arrivalTime: this.excelTimeToReadableTime(row[7]),    // Колонка H - время приб(факт)
            flightTime: this.excelTimeToReadableTime(row[8]),     // Колонка I - время в пути(факт)
            configuration: row[9] || '',  // Колонка J - компоновка
            passengers: row[10] || '',    // Колонка K - ADLT+CHLD+INF
            paxPercentage: row[11] || '', // Колонка L - % PAX
            baggage: row[12] || '',       // Колонка M - баг. кг.
            crew: row[13] || '',          // Колонка N - летчики
            sourceFile: originalName,
            uploadedAt: Date.now(),
            source: 'email' // Указываем источник
          };
        }).filter(flight => flight !== null && flight.date && flight.date !== 'Invalid Date'); // Убираем пустые строки и некорректные даты

        console.log(`Извлечено ${flights.length} рейсов из файла ${originalName}`);
        console.log('Примеры извлеченных данных:', flights.slice(0, 3));
        
        // Сохраняем данные рейсов в базу данных
        if (flights.length > 0) {
          try {
            await databaseService.saveFlightData(flights);
            console.log(`Сохранено ${flights.length} рейсов в PostgreSQL`);
          } catch (dbError) {
            console.error('Ошибка сохранения в базу данных:', dbError);
          }
        }
        
        resolve(flights);
      } catch (error) {
        console.error('Ошибка при парсинге Excel файла:', error);
        reject(error);
      }
    });
  }

  // Обработка файла из почты
  async processEmailFile(metadata) {
    try {
      console.log(`Обрабатываем файл из почты: ${metadata.originalName}`);
      
      // Парсим Excel файл
      const flights = await this.parseExcelFile(metadata.filepath, metadata.originalName);
      
      // Создаем объект файла в формате FilesContext
      const fileInfo = {
        id: Date.now() + Math.random(),
        date: new Date().toLocaleDateString('ru-RU'),
        fileName: metadata.originalName,
        size: this.formatFileSize(metadata.size),
        author: `Почта: ${metadata.emailFrom}`,
        uploadedAt: Date.now(),
        status: 'completed',
        flightsCount: flights.length,
        source: 'email',
        emailSubject: metadata.emailSubject,
        emailDate: metadata.emailDate
      };

      // Возвращаем обработанные данные
      return {
        fileInfo,
        flights,
        success: true
      };

    } catch (error) {
      console.error(`Ошибка при обработке файла ${metadata.originalName}:`, error);
      
      return {
        fileInfo: {
          id: Date.now() + Math.random(),
          date: new Date().toLocaleDateString('ru-RU'),
          fileName: metadata.originalName,
          size: this.formatFileSize(metadata.size),
          author: `Почта: ${metadata.emailFrom}`,
          uploadedAt: Date.now(),
          status: 'error',
          error: error.message,
          source: 'email',
          emailSubject: metadata.emailSubject,
          emailDate: metadata.emailDate
        },
        flights: [],
        success: false,
        error: error.message
      };
    }
  }

  // Форматирование размера файла
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Получение всех обработанных файлов из почты
  async getProcessedEmailFiles() {
    try {
      const emailService = require('./emailService');
      const emailFiles = await emailService.getEmailFiles();
      
      const processedFiles = [];
      
      for (const metadata of emailFiles) {
        const result = await this.processEmailFile(metadata);
        processedFiles.push(result);
      }
      
      return processedFiles;
    } catch (error) {
      console.error('Ошибка при получении обработанных файлов из почты:', error);
      return [];
    }
  }
}

module.exports = new FileProcessor(); 