import React, { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const FilesContext = createContext(null);

// Функции для работы с IndexedDB для хранения оригинальных файлов
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SamairFilesDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };
  });
};

const saveFileToIndexedDB = async (fileId, file) => {
  try {
    // Сначала получаем данные файла (это может быть долго)
    console.log(`Читаем arrayBuffer для файла ${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    console.log(`ArrayBuffer получен для файла ${file.name}, размер: ${arrayBuffer.byteLength} байт`);

    // Теперь создаем транзакцию с уже готовыми данными
    const db = await openDB();
    console.log(`Создаем транзакцию для сохранения файла ${file.name}`);
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');

    const fileData = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      data: arrayBuffer
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fileData);

      request.onerror = () => {
        console.error('Ошибка IndexedDB при сохранении:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Файл ${file.name} сохранен в IndexedDB`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Ошибка транзакции IndexedDB:', transaction.error);
        reject(transaction.error);
      };

      transaction.onabort = () => {
        console.error('Транзакция IndexedDB была прервана');
        reject(new Error('Транзакция была прервана'));
      };
    });
  } catch (error) {
    console.error('Ошибка при сохранении файла в IndexedDB:', error);
    throw error;
  }
};

const getFileFromIndexedDB = async (fileId) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');

    return new Promise((resolve, reject) => {
      const request = store.get(fileId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          const fileData = request.result;
          const file = new File([fileData.data], fileData.name, {
            type: fileData.type,
            lastModified: fileData.lastModified
          });
          resolve(file);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('Ошибка при получении файла из IndexedDB:', error);
    throw error;
  }
};

const deleteFileFromIndexedDB = async (fileId) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');

    return new Promise((resolve, reject) => {
      const request = store.delete(fileId);

      request.onerror = () => {
        console.error('Ошибка IndexedDB при удалении:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Файл с ID ${fileId} удален из IndexedDB`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Ошибка транзакции IndexedDB при удалении:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Ошибка при удалении файла из IndexedDB:', error);
    throw error;
  }
};

export const FilesProvider = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [flightData, setFlightData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загружаем файлы и данные рейсов из localStorage при инициализации
  useEffect(() => {
    const loadData = async () => {
      const savedFiles = localStorage.getItem('uploadedFiles');
      const savedFlightData = localStorage.getItem('flightData');

      if (savedFiles) {
        try {
          const parsedFiles = JSON.parse(savedFiles);
          setUploadedFiles(parsedFiles);
          console.log('Файлы загружены из localStorage:', parsedFiles);
        } catch (error) {
          console.error('Ошибка при загрузке файлов из localStorage:', error);
        }
      }

      if (savedFlightData) {
        try {
          const parsedFlightData = JSON.parse(savedFlightData);
          setFlightData(parsedFlightData);
          console.log('Данные рейсов загружены из localStorage:', parsedFlightData);
        } catch (error) {
          console.error('Ошибка при загрузке данных рейсов из localStorage:', error);
        }
      }

      // Загружаем файлы из почты
      try {
        await loadEmailFiles();
      } catch (error) {
        console.error('Ошибка при загрузке файлов из почты:', error);
      }

      setIsLoaded(true);
    };

    loadData();
  }, []);

  // Сохраняем файлы в localStorage при изменении (только после загрузки)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
      console.log('Файлы сохранены в localStorage:', uploadedFiles);
    }
  }, [uploadedFiles, isLoaded]);

  // Сохраняем данные рейсов в localStorage при изменении (только после загрузки)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('flightData', JSON.stringify(flightData));
      console.log('Данные рейсов сохранены в localStorage:', flightData);
    }
  }, [flightData, isLoaded]);

  // Функция для форматирования размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Функция для конвертации Excel серийного номера даты в обычную дату
  const excelSerialDateToJSDate = (serial) => {
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
  };

  // Функция для конвертации времени из Excel формата в читаемый вид
  const excelTimeToReadableTime = (timeValue) => {
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
  };

  // Функция для парсинга Excel файла и извлечения данных рейсов
  const parseExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      console.log(`Начинаем парсинг файла: ${file.name}, размер: ${file.size} байт, тип: ${file.type}`);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          console.log(`FileReader успешно прочитал файл ${file.name}`);
          const data = new Uint8Array(e.target.result);
          console.log(`Размер данных после чтения: ${data.length} байт`);

          const workbook = XLSX.read(data, { type: 'array', cellDates: false });
          console.log(`XLSX.read успешно выполнен для файла ${file.name}`);
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
            console.log(`Файл ${file.name} содержит менее 4 строк, возвращаем пустой массив`);
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
            const convertedDate = excelSerialDateToJSDate(row[2]);

            return {
              id: `flight_${file.name}_${index}`,
              number: row[1] || '',         // Колонка B - номер рейса
              date: convertedDate,          // Колонка C - дата  
              aircraftType: row[3] || '',   // Колонка D - тип ВС
              departure: row[4] || '',      // Колонка E - вылет
              arrival: row[5] || '',        // Колонка F - прилет
              departureTime: excelTimeToReadableTime(row[6]),  // Колонка G - время отпр(факт)
              arrivalTime: excelTimeToReadableTime(row[7]),    // Колонка H - время приб(факт)
              flightTime: excelTimeToReadableTime(row[8]),     // Колонка I - время в пути(факт)
              configuration: row[9] || '',  // Колонка J - компоновка
              passengers: row[10] || '',    // Колонка K - ADLT+CHLD+INF
              paxPercentage: row[11] || '', // Колонка L - % PAX
              baggage: row[12] || '',       // Колонка M - баг. кг.
              crew: row[13] || '',          // Колонка N - летчики
              sourceFile: file.name,
              uploadedAt: Date.now()
            };
          }).filter(flight => flight !== null && flight.date && flight.date !== 'Invalid Date'); // Убираем пустые строки и некорректные даты

          console.log(`Извлечено ${flights.length} рейсов из файла ${file.name}`);
          console.log('Примеры извлеченных данных:', flights.slice(0, 3));
          resolve(flights);
        } catch (error) {
          console.error('Ошибка при парсинге Excel файла:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        console.error(`Ошибка FileReader при чтении файла ${file.name}:`, reader.error);
        reject(new Error(`Ошибка при чтении файла: ${reader.error?.message || 'Неизвестная ошибка'}`));
      };

      try {
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error(`Ошибка при запуске FileReader для файла ${file.name}:`, error);
        reject(new Error(`Ошибка при запуске чтения файла: ${error.message}`));
      }
    });
  };

  // Добавление новых файлов
  const addFiles = async (files) => {
    const newFiles = [];
    const newFlightData = [];

    for (const file of Array.from(files)) {
      const fileId = Date.now() + Math.random(); // Уникальный ID
      const fileInfo = {
        id: fileId,
        date: new Date().toLocaleDateString('ru-RU'),
        fileName: file.name,
        size: formatFileSize(file.size),
        author: 'Текущий пользователь',
        uploadedAt: Date.now(), // Временная метка для сортировки
        status: 'processing', // Статус обработки
        // Сохраняем базовую информацию о файле, но не сам файл для localStorage
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };

      newFiles.push(fileInfo);

      try {
        console.log(`Начинаем обработку файла: ${file.name}`);

        // Сохраняем оригинальный файл в IndexedDB
        console.log(`Сохраняем файл ${file.name} в IndexedDB...`);
        await saveFileToIndexedDB(fileId, file);
        console.log(`Файл ${file.name} успешно сохранен в IndexedDB`);

        // Парсим Excel файл для извлечения данных рейсов
        console.log(`Парсим Excel файл ${file.name}...`);
        const flights = await parseExcelFile(file);
        console.log(`Извлечено ${flights.length} рейсов из файла ${file.name}`);
        newFlightData.push(...flights);

        // Обновляем статус файла
        fileInfo.status = 'completed';
        fileInfo.flightsCount = flights.length;
        console.log(`Файл ${file.name} успешно обработан`);
      } catch (error) {
        console.error(`Ошибка при обработке файла ${file.name}:`, error);
        console.error('Подробности ошибки:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        fileInfo.status = 'error';
        fileInfo.error = error.message;
        fileInfo.errorDetails = {
          name: error.name,
          stack: error.stack
        };
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setFlightData(prev => [...prev, ...newFlightData]);

    return newFiles;
  };

  // Удаление файла
  const removeFile = async (fileId) => {
    const fileToRemove = uploadedFiles.find(file => file.id === fileId);
    if (fileToRemove) {
      try {
        // Удаляем файл из IndexedDB
        await deleteFileFromIndexedDB(fileId);
      } catch (error) {
        console.error('Ошибка при удалении файла из IndexedDB:', error);
      }

      // Удаляем файл из состояния
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      // Удаляем связанные данные рейсов
      setFlightData(prev => prev.filter(flight => flight.sourceFile !== fileToRemove.fileName));
    }
  };

  // Функция для скачивания оригинального файла
  const downloadOriginalFile = async (fileId, fileName) => {
    try {
      const file = await getFileFromIndexedDB(fileId);
      if (!file) {
        throw new Error('Файл не найден');
      }

      // Создаем URL для скачивания
      const url = URL.createObjectURL(file);

      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Очищаем ресурсы
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`Файл ${fileName} успешно скачан`);
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
      throw error;
    }
  };

  // Очистка всех файлов
  const clearAllFiles = async () => {
    try {
      // Удаляем все файлы из IndexedDB
      for (const file of uploadedFiles) {
        await deleteFileFromIndexedDB(file.id);
      }
    } catch (error) {
      console.error('Ошибка при очистке IndexedDB:', error);
    }

    setUploadedFiles([]);
    setFlightData([]);
  };

  // Получение файла по ID
  const getFileById = (fileId) => {
    return uploadedFiles.find(file => file.id === fileId);
  };

  // Получение данных рейсов с фильтрацией и сортировкой
  const getFlightData = (filters = {}) => {
    let filteredData = [...flightData];

    // Фильтрация по дате
    if (filters.dateFrom) {
      filteredData = filteredData.filter(flight => new Date(flight.date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filteredData = filteredData.filter(flight => new Date(flight.date) <= new Date(filters.dateTo));
    }

    // Фильтрация по типу ВС
    if (filters.aircraftType) {
      filteredData = filteredData.filter(flight =>
        flight.aircraftType.toLowerCase().includes(filters.aircraftType.toLowerCase())
      );
    }

    // Сортировка по дате (по умолчанию)
    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    return filteredData;
  };

  // Загрузка файлов из почты
  const loadEmailFiles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/email-files');
      if (response.ok) {
        const emailFiles = await response.json();

        // Добавляем файлы из почты к существующим файлам
        if (emailFiles.length > 0) {
          const newEmailFiles = [];
          const newEmailFlightData = [];

          for (const emailFile of emailFiles) {
            // Проверяем, нет ли уже такого файла
            const existingFile = uploadedFiles.find(file =>
              file.fileName === emailFile.fileInfo.fileName &&
              file.source === 'email'
            );

            if (!existingFile) {
              newEmailFiles.push(emailFile.fileInfo);
              newEmailFlightData.push(...emailFile.flights);
            }
          }

          if (newEmailFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...newEmailFiles]);
            setFlightData(prev => [...prev, ...newEmailFlightData]);
            console.log(`Добавлено ${newEmailFiles.length} файлов из почты`);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке файлов из почты:', error);
    }
  };

  // Получение статистики
  const getFlightStats = () => {
    return {
      totalFlights: flightData.length,
      totalFiles: uploadedFiles.length,
      completedFiles: uploadedFiles.filter(file => file.status === 'completed').length,
      errorFiles: uploadedFiles.filter(file => file.status === 'error').length,
      emailFiles: uploadedFiles.filter(file => file.source === 'email').length,
      manualFiles: uploadedFiles.filter(file => file.source !== 'email').length
    };
  };

  const value = {
    uploadedFiles,
    flightData,
    addFiles,
    removeFile,
    clearAllFiles,
    getFileById,
    getFlightData,
    getFlightStats,
    downloadOriginalFile,
    loadEmailFiles,
    filesCount: uploadedFiles.length,
    flightsCount: flightData.length
  };

  return (
    <FilesContext.Provider value={value}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FilesContext);
  if (!context) {
    throw new Error('useFiles must be used within a FilesProvider');
  }
  return context;
}; 