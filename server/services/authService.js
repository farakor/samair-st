const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Генерируем JWT секрет если не установлен
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

class AuthService {
  /**
   * Хеширует пароль
   */
  static async hashPassword(password) {
    try {
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
      throw new Error('Ошибка хеширования пароля');
    }
  }

  /**
   * Проверяет пароль
   */
  static async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Ошибка проверки пароля');
    }
  }

  /**
   * Генерирует JWT токен
   */
  static generateToken(userId, email, role) {
    try {
      const payload = {
        userId,
        email,
        role,
        iat: Math.floor(Date.now() / 1000)
      };

      return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'samair-system',
        audience: 'samair-users'
      });
    } catch (error) {
      throw new Error('Ошибка генерации токена');
    }
  }

  /**
   * Верифицирует JWT токен
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'samair-system',
        audience: 'samair-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Токен истек');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Недействительный токен');
      } else {
        throw new Error('Ошибка верификации токена');
      }
    }
  }

  /**
   * Генерирует случайный пароль
   */
  static generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    // Обеспечиваем минимум по одному символу каждого типа
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += symbols[crypto.randomInt(symbols.length)];
    
    // Заполняем оставшуюся длину
    for (let i = password.length; i < length; i++) {
      password += charset[crypto.randomInt(charset.length)];
    }
    
    // Перемешиваем символы
    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
  }

  /**
   * Middleware для проверки JWT токена
   */
  static authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    try {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }
  }

  /**
   * Middleware для проверки роли суперадмина
   */
  static requireSuperAdmin(req, res, next) {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ только для суперадминистратора' });
    }
    next();
  }

  /**
   * Middleware для проверки полного доступа
   */
  static requireFullAccess(req, res, next) {
    const allowedRoles = ['superadmin', 'full_access'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Недостаточно прав доступа' });
    }
    next();
  }

  /**
   * Валидация силы пароля
   */
  static validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Пароль должен содержать минимум ${minLength} символов`);
    }
    if (!hasUpperCase) {
      errors.push('Пароль должен содержать заглавные буквы');
    }
    if (!hasLowerCase) {
      errors.push('Пароль должен содержать строчные буквы');
    }
    if (!hasNumbers) {
      errors.push('Пароль должен содержать цифры');
    }
    if (!hasSpecialChar) {
      errors.push('Пароль должен содержать специальные символы');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = AuthService;