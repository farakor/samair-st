const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Разрешенные типы файлов
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/csv'
];

// Разрешенные расширения файлов
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// Максимальный размер файла (50MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;

/**
 * Проверка типа файла
 */
const fileFilter = (req, file, cb) => {
  try {
    // Проверяем MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Недопустимый тип файла: ${file.mimetype}. Разрешены только: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }

    // Проверяем расширение файла
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return cb(new Error(`Недопустимое расширение файла: ${fileExtension}. Разрешены только: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
    }

    // Проверяем имя файла на опасные символы
    const fileName = file.originalname;
    const dangerousPattern = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousPattern.test(fileName)) {
      return cb(new Error('Имя файла содержит недопустимые символы'), false);
    }

    // Проверяем длину имени файла
    if (fileName.length > 255) {
      return cb(new Error('Имя файла слишком длинное (максимум 255 символов)'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('Ошибка при проверке файла'), false);
  }
};

/**
 * Настройка хранения файлов
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../data/uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Генерируем безопасное имя файла
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const originalExtension = path.extname(file.originalname);
    const safeFileName = `${timestamp}_${randomBytes}${originalExtension}`;
    
    // Сохраняем оригинальное имя для дальнейшего использования
    req.originalFileName = file.originalname;
    
    cb(null, safeFileName);
  }
});

/**
 * Конфигурация multer
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // максимум 5 файлов за раз
    fields: 10, // максимум 10 полей формы
    fieldNameSize: 100, // максимальная длина имени поля
    fieldSize: 1024 * 1024 // максимальный размер поля (1MB)
  }
});

/**
 * Middleware для обработки ошибок загрузки файлов
 */
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: `Файл слишком большой. Максимальный размер: ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Слишком много файлов. Максимум 5 файлов за раз'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Неожиданное поле файла'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          error: 'Слишком много полей формы'
        });
      default:
        return res.status(400).json({
          error: `Ошибка загрузки файла: ${error.message}`
        });
    }
  }

  if (error) {
    return res.status(400).json({
      error: error.message || 'Ошибка при загрузке файла'
    });
  }

  next();
};

/**
 * Middleware для проверки загруженных файлов
 */
const validateUploadedFiles = (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Файлы не найдены'
      });
    }

    // Дополнительная проверка каждого файла
    for (const file of req.files) {
      // Проверяем, что файл действительно сохранен
      if (!file.path || !file.filename) {
        return res.status(400).json({
          error: 'Ошибка сохранения файла'
        });
      }

      // Проверяем размер файла
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `Файл ${file.originalname} слишком большой`
        });
      }
    }

    next();
  } catch (error) {
    console.error('Ошибка валидации файлов:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка при проверке файлов'
    });
  }
};

/**
 * Sanitization имени файла
 */
const sanitizeFileName = (fileName) => {
  // Удаляем опасные символы
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
};

module.exports = {
  upload,
  handleUploadErrors,
  validateUploadedFiles,
  sanitizeFileName,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};