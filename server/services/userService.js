const AuthService = require('./authService');
const { query } = require('../config/database');

/**
 * Сервис для работы с пользователями с улучшенной безопасностью
 */
class UserService {
  constructor() {
    this.isInitialized = false;
    // Не инициализируем сразу, дождемся создания таблиц
  }

  /**
   * Инициализация пользователей с хешированными паролями
   */
  async initializeUsers() {
    try {
      // Проверяем существование суперадминистраторов
      const existingAdmins = await query(`
        SELECT id FROM users WHERE role = 'superadmin'
      `);

      if (existingAdmins.rows.length === 0) {
        console.log('👥 Создание начальных суперадминистраторов...');
        
        // Хешируем пароль суперадминистратора
        const hashedPassword = await AuthService.hashPassword('eNL+i6wQ$56Kj?W');
        
        const initialUsers = [
          {
            email: 'farrukh.oripov@gmail.com',
            name: 'Орипов Фаррух',
            role: 'superadmin',
            password: hashedPassword
          },
          {
            email: 'farrukhoripov@gmail.com',
            name: 'Орипов Фаррух (альт)',
            role: 'superadmin',
            password: hashedPassword
          }
        ];

        for (const user of initialUsers) {
          await query(`
            INSERT INTO users (email, name, role, password, created_at, is_active)
            VALUES ($1, $2, $3, $4, NOW(), true)
            ON CONFLICT (email) DO NOTHING
          `, [user.email, user.name, user.role, user.password]);
        }
        
        console.log('✅ Начальные суперадминистраторы созданы');
      } else {
        console.log(`✅ Найдено ${existingAdmins.rows.length} суперадминистраторов в базе данных`);
      }

      this.isInitialized = true;
      console.log('✅ Пользователи инициализированы с базой данных PostgreSQL');
    } catch (error) {
      console.error('❌ Ошибка инициализации пользователей:', error);
      throw error;
    }
  }

  /**
   * Аутентификация пользователя
   */
  async authenticateUser(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email и пароль обязательны');
      }

      console.log(`🔍 Попытка аутентификации пользователя: ${email}`);
      
      // Ищем пользователя в базе данных
      const userResult = await query(`
        SELECT id, email, name, role, password, last_login, is_active 
        FROM users 
        WHERE email = $1 AND is_active = true
      `, [email]);

      if (userResult.rows.length === 0) {
        throw new Error('Пользователь не найден');
      }

      const user = userResult.rows[0];
      console.log(`👥 Найден пользователь: ${user.email} (${user.role})`);

      const isPasswordValid = await AuthService.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        throw new Error('Неверный пароль');
      }

      // Обновляем время последнего входа
      await query(`
        UPDATE users 
        SET last_login = NOW() 
        WHERE id = $1
      `, [user.id]);

      // Генерируем JWT токен
      const token = AuthService.generateToken(user.id, user.email, user.role);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Создание нового пользователя
   */
  async createUser(userData, creatorId) {
    try {
      // Проверяем права создателя
      const creatorResult = await query(`
        SELECT id, role FROM users WHERE id = $1 AND is_active = true
      `, [creatorId]);

      if (creatorResult.rows.length === 0 || creatorResult.rows[0].role !== 'superadmin') {
        throw new Error('Только суперадмин может создавать пользователей');
      }

      // Проверяем, что пользователь с таким email не существует
      const existingUserResult = await query(`
        SELECT id FROM users WHERE email = $1
      `, [userData.email.toLowerCase().trim()]);

      if (existingUserResult.rows.length > 0) {
        throw new Error('Пользователь с таким email уже существует');
      }

      // Валидация email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error('Неверный формат email');
      }

      // Генерируем безопасный пароль
      const password = AuthService.generateSecurePassword(16);
      const hashedPassword = await AuthService.hashPassword(password);

      // Создаем пользователя в базе данных
      const insertResult = await query(`
        INSERT INTO users (email, name, role, password, created_at, is_active)
        VALUES ($1, $2, $3, $4, NOW(), true)
        RETURNING id, email, name, role, created_at
      `, [
        userData.email.toLowerCase().trim(),
        userData.name.trim(),
        userData.role,
        hashedPassword
      ]);

      const newUser = insertResult.rows[0];

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.created_at
        },
        generatedPassword: password
      };
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      throw error;
    }
  }

  /**
   * Обновление пользователя
   */
  async updateUser(userId, updateData, updaterId) {
    try {
      // Проверяем права обновителя
      const updaterResult = await query(`
        SELECT id, role FROM users WHERE id = $1 AND is_active = true
      `, [updaterId]);

      if (updaterResult.rows.length === 0 || updaterResult.rows[0].role !== 'superadmin') {
        throw new Error('Только суперадмин может обновлять пользователей');
      }

      // Проверяем существование обновляемого пользователя
      const userResult = await query(`
        SELECT id, email, name, role, is_active FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('Пользователь не найден');
      }

      const user = userResult.rows[0];

      // Защита от изменения суперадмина
      if (user.role === 'superadmin' && userId !== updaterId) {
        throw new Error('Нельзя изменять данные другого суперадмина');
      }

      // Подготавливаем обновления
      const allowedFields = ['name', 'email', 'role', 'is_active'];
      const updates = [];
      const values = [];
      let valueIndex = 1;

      for (const field of allowedFields) {
        const updateField = field === 'is_active' ? 'isActive' : field;
        if (updateData[updateField] !== undefined) {
          if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updateData[updateField])) {
              throw new Error('Неверный формат email');
            }
            updates.push(`${field} = $${valueIndex}`);
            values.push(updateData[updateField].toLowerCase().trim());
          } else if (field === 'name') {
            updates.push(`${field} = $${valueIndex}`);
            values.push(updateData[updateField].trim());
          } else {
            updates.push(`${field} = $${valueIndex}`);
            values.push(updateData[updateField]);
          }
          valueIndex++;
        }
      }

      if (updates.length === 0) {
        throw new Error('Нет данных для обновления');
      }

      // Выполняем обновление
      values.push(userId);
      const updateResult = await query(`
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING id, email, name, role, is_active
      `, values);

      return {
        success: true,
        user: {
          id: updateResult.rows[0].id,
          email: updateResult.rows[0].email,
          name: updateResult.rows[0].name,
          role: updateResult.rows[0].role,
          isActive: updateResult.rows[0].is_active
        }
      };
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      throw error;
    }
  }

  /**
   * Удаление пользователя
   */
  async deleteUser(userId, deleterId) {
    try {
      // Проверяем права удаляющего
      const deleterResult = await query(`
        SELECT id, role FROM users WHERE id = $1 AND is_active = true
      `, [deleterId]);

      if (deleterResult.rows.length === 0 || deleterResult.rows[0].role !== 'superadmin') {
        throw new Error('Только суперадмин может удалять пользователей');
      }

      // Проверяем существование удаляемого пользователя
      const userResult = await query(`
        SELECT id, role FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('Пользователь не найден');
      }

      const userToDelete = userResult.rows[0];

      if (userToDelete.role === 'superadmin') {
        throw new Error('Нельзя удалить суперадмина');
      }

      // Удаляем пользователя из базы данных
      await query(`
        DELETE FROM users WHERE id = $1
      `, [userId]);

      return {
        success: true,
        message: 'Пользователь успешно удален'
      };
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      throw error;
    }
  }

  /**
   * Получение всех пользователей
   */
  async getAllUsers(requesterId) {
    try {
      // Проверяем права запрашивающего
      const requesterResult = await query(`
        SELECT id, role FROM users WHERE id = $1 AND is_active = true
      `, [requesterId]);

      if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'superadmin') {
        throw new Error('Только суперадмин может просматривать список пользователей');
      }

      // Получаем всех пользователей
      const usersResult = await query(`
        SELECT id, email, name, role, created_at, last_login, is_active
        FROM users
        ORDER BY created_at DESC
      `);

      return usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        isActive: user.is_active
      }));
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      throw error;
    }
  }

  /**
   * Смена пароля
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Получаем пользователя
      const userResult = await query(`
        SELECT id, password FROM users WHERE id = $1 AND is_active = true
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('Пользователь не найден');
      }

      const user = userResult.rows[0];

      // Проверяем текущий пароль
      const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Неверный текущий пароль');
      }

      // Валидируем новый пароль
      const passwordValidation = AuthService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Пароль не соответствует требованиям: ${passwordValidation.errors.join(', ')}`);
      }

      // Хешируем новый пароль
      const hashedNewPassword = await AuthService.hashPassword(newPassword);

      // Обновляем пароль в базе данных
      await query(`
        UPDATE users SET password = $1 WHERE id = $2
      `, [hashedNewPassword, userId]);

      return {
        success: true,
        message: 'Пароль успешно изменен'
      };
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      throw error;
    }
  }

  /**
   * Сброс пароля пользователя (только для суперадмина и пользователей с полным доступом)
   */
  async resetPassword(userId, reseterId) {
    try {
      // Проверяем права сбрасывающего
      const reseterResult = await query(`
        SELECT id, role FROM users WHERE id = $1 AND is_active = true
      `, [reseterId]);

      if (reseterResult.rows.length === 0 || 
          (reseterResult.rows[0].role !== 'superadmin' && reseterResult.rows[0].role !== 'full_access')) {
        throw new Error('Только суперадмин и пользователи с полным доступом могут сбрасывать пароли');
      }

      // Получаем пользователя для сброса
      const userResult = await query(`
        SELECT id, email, name, role FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('Пользователь не найден');
      }

      const userToReset = userResult.rows[0];

      // Защита от сброса пароля суперадмина
      if (userToReset.role === 'superadmin' && userId !== reseterId) {
        throw new Error('Никто не может сбросить пароль суперадмина, кроме него самого');
      }

      // Генерируем новый безопасный пароль
      const newPassword = AuthService.generateSecurePassword(16);
      const hashedPassword = await AuthService.hashPassword(newPassword);

      // Обновляем пароль пользователя в базе данных
      await query(`
        UPDATE users SET password = $1 WHERE id = $2
      `, [hashedPassword, userId]);

      return {
        success: true,
        user: {
          id: userToReset.id,
          email: userToReset.email,
          name: userToReset.name,
          role: userToReset.role
        },
        newPassword: newPassword
      };
    } catch (error) {
      console.error('Ошибка сброса пароля:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(userId) {
    try {
      const userResult = await query(`
        SELECT id, email, name, role, created_at, last_login, is_active
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        isActive: user.is_active
      };
    } catch (error) {
      console.error('Ошибка получения пользователя по ID:', error);
      return null;
    }
  }

  /**
   * Проверка инициализации
   */
  getInitializationStatus() {
    return this.isInitialized;
  }
}

// Экспортируем singleton
const userService = new UserService();
module.exports = userService;