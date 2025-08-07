const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const AuthService = require('../services/authService');
const userService = require('../services/userService');
const emailService = require('../services/emailService');

const router = express.Router();

// Rate limiting для аутентификации (временно ослаблено для тестирования)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 50, // максимум 50 попыток за 15 минут (временно для тестирования)
  message: {
    error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
      retryAfter: 15 * 60
    });
  }
});

// Rate limiting для создания пользователей
const createUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 10, // максимум 10 пользователей в час
  message: {
    error: 'Слишком много создано пользователей. Попробуйте через час.',
    retryAfter: 60 * 60
  }
});

// Валидация для входа
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Неверный формат email'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Пароль обязателен')
];

// Валидация для создания пользователя
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Неверный формат email'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .escape()
    .withMessage('Имя должно содержать от 2 до 100 символов'),
  body('role')
    .isIn(['superadmin', 'full_access', 'read_only'])
    .withMessage('Недопустимая роль')
];

// Валидация для смены пароля
const changePasswordValidation = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Текущий пароль обязателен'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Новый пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и специальные символы')
];

/**
 * Обработка ошибок валидации
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /auth/login - Вход в систему
 */
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Дожидаемся инициализации пользователей
    let attempts = 0;
    while (!userService.getInitializationStatus() && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!userService.getInitializationStatus()) {
      return res.status(500).json({
        success: false,
        error: 'Система пользователей не инициализирована'
      });
    }

    console.log('🔐 Сервис аутентификации готов, попытка входа...');
    console.log('📧 Получен email в запросе:', JSON.stringify(email));
    console.log('📧 Тип данных email:', typeof email);
    console.log('📧 Длина email:', email.length);
    console.log('📧 Email побайтово:', Array.from(email).map(c => c.charCodeAt(0)));
    const result = await userService.authenticateUser(email, password);

    if (result.success) {
      res.json({
        success: true,
        message: 'Успешный вход в систему',
        token: result.token,
        user: result.user
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /auth/verify - Проверка токена
 */
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Токен обязателен'
      });
    }

    const decoded = AuthService.verifyToken(token);
    const user = userService.getUserById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден или деактивирован'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/logout - Выход из системы
 */
router.post('/logout', AuthService.authenticateToken, (req, res) => {
  // JWT токены stateless, поэтому просто подтверждаем выход
  res.json({
    success: true,
    message: 'Успешный выход из системы'
  });
});

/**
 * GET /auth/profile - Получение профиля пользователя
 */
router.get('/profile', AuthService.authenticateToken, (req, res) => {
  try {
    const user = userService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения профиля'
    });
  }
});

/**
 * POST /auth/change-password - Смена пароля
 */
router.post('/change-password', 
  AuthService.authenticateToken, 
  changePasswordValidation, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const result = await userService.changePassword(
        req.user.userId, 
        currentPassword, 
        newPassword
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /auth/users - Получение списка пользователей (только для суперадмина)
 */
router.get('/users', 
  AuthService.authenticateToken, 
  AuthService.requireSuperAdmin, 
  (req, res) => {
    try {
      const users = userService.getAllUsers(req.user.userId);
      res.json({
        success: true,
        users: users
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /auth/users - Создание нового пользователя (только для суперадмина)
 */
router.post('/users', 
  createUserLimiter,
  AuthService.authenticateToken, 
  AuthService.requireSuperAdmin,
  createUserValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await userService.createUser(req.body, req.user.userId);

      // Отправляем приветственное письмо
      try {
        await emailService.sendWelcomeEmail(
          result.user.email, 
          result.user.name, 
          result.generatedPassword
        );
      } catch (emailError) {
        console.error('Ошибка отправки приветственного письма:', emailError);
        // Не прерываем создание пользователя
      }

      res.status(201).json({
        success: true,
        message: 'Пользователь успешно создан',
        user: result.user,
        generatedPassword: result.generatedPassword
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * PUT /auth/users/:id - Обновление пользователя (только для суперадмина)
 */
router.put('/users/:id', 
  AuthService.authenticateToken, 
  AuthService.requireSuperAdmin,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await userService.updateUser(userId, req.body, req.user.userId);

      res.json({
        success: true,
        message: 'Пользователь успешно обновлен',
        user: result.user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * DELETE /auth/users/:id - Удаление пользователя (только для суперадмина)
 */
router.delete('/users/:id', 
  AuthService.authenticateToken, 
  AuthService.requireSuperAdmin,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await userService.deleteUser(userId, req.user.userId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /auth/users/:id/reset-password - Сброс пароля пользователя (для суперадмина и полного доступа)
 */
router.post('/users/:id/reset-password', 
  AuthService.authenticateToken, 
  AuthService.requireFullAccess,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Проверяем, что пароль не сбрасывается самому себе, если это не суперадмин
      if (userId === req.user.userId && req.user.role !== 'superadmin') {
        return res.status(400).json({
          success: false,
          error: 'Для сброса собственного пароля используйте функцию смены пароля'
        });
      }

      const result = await userService.resetPassword(userId, req.user.userId);

      // Отправляем письмо с новым паролем
      try {
        await emailService.sendPasswordResetEmail(
          result.user.email, 
          result.user.name, 
          result.newPassword
        );
      } catch (emailError) {
        console.error('Ошибка отправки письма со сброшенным паролем:', emailError);
        // Не прерываем процесс, просто логируем ошибку
      }

      res.json({
        success: true,
        message: 'Пароль успешно сброшен и отправлен на email пользователя',
        user: result.user
        // НЕ возвращаем новый пароль в ответе по соображениям безопасности
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;