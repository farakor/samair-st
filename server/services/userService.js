const AuthService = require('./authService');

/**
 * Сервис для работы с пользователями с улучшенной безопасностью
 */
class UserService {
  constructor() {
    this.users = [];
    this.isInitialized = false;
    this.initializeUsers();
  }

  /**
   * Инициализация пользователей с хешированными паролями
   */
  async initializeUsers() {
    try {
      // Хешируем пароль суперадминистратора
      const hashedPassword = await AuthService.hashPassword('eNL+i6wQ$56Kj?W');
      
      const initialUsers = [
        {
          id: 1,
          email: 'farrukh.oripov@gmail.com',
          name: 'Орипов Фаррух',
          role: 'superadmin',
          password: hashedPassword,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          isActive: true
        },
        {
          id: 2,
          email: 'farrukhoripov@gmail.com',
          name: 'Орипов Фаррух (альт)',
          role: 'superadmin',
          password: hashedPassword,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          isActive: true
        }
      ];

      this.users = initialUsers;
      this.isInitialized = true;
      console.log('✅ Пользователи инициализированы с хешированными паролями');
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
      console.log(`📊 Всего пользователей в системе: ${this.users.length}`);
      console.log(`👥 Пользователи:`, this.users.map(u => ({ email: u.email, active: u.isActive })));

      const user = this.users.find(u => u.email === email && u.isActive);
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      const isPasswordValid = await AuthService.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        throw new Error('Неверный пароль');
      }

      // Обновляем время последнего входа
      user.lastLogin = new Date().toISOString();

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
          lastLogin: user.lastLogin
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
      const creator = this.users.find(u => u.id === creatorId);
      if (!creator || creator.role !== 'superadmin') {
        throw new Error('Только суперадмин может создавать пользователей');
      }

      // Проверяем, что пользователь с таким email не существует
      if (this.users.find(u => u.email === userData.email)) {
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

      const newUser = {
        id: Date.now(),
        email: userData.email.toLowerCase().trim(),
        name: userData.name.trim(),
        role: userData.role,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true
      };

      this.users.push(newUser);

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.createdAt
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
      const updater = this.users.find(u => u.id === updaterId);
      if (!updater || updater.role !== 'superadmin') {
        throw new Error('Только суперадмин может обновлять пользователей');
      }

      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        throw new Error('Пользователь не найден');
      }

      const user = this.users[userIndex];

      // Защита от изменения суперадмина
      if (user.role === 'superadmin' && userId !== updaterId) {
        throw new Error('Нельзя изменять данные другого суперадмина');
      }

      // Обновляем только разрешенные поля
      const allowedFields = ['name', 'email', 'role', 'isActive'];
      const updates = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updateData[field])) {
              throw new Error('Неверный формат email');
            }
            updates[field] = updateData[field].toLowerCase().trim();
          } else if (field === 'name') {
            updates[field] = updateData[field].trim();
          } else {
            updates[field] = updateData[field];
          }
        }
      }

      this.users[userIndex] = { ...user, ...updates };

      return {
        success: true,
        user: {
          id: this.users[userIndex].id,
          email: this.users[userIndex].email,
          name: this.users[userIndex].name,
          role: this.users[userIndex].role,
          isActive: this.users[userIndex].isActive
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
      const deleter = this.users.find(u => u.id === deleterId);
      if (!deleter || deleter.role !== 'superadmin') {
        throw new Error('Только суперадмин может удалять пользователей');
      }

      const userToDelete = this.users.find(u => u.id === userId);
      if (!userToDelete) {
        throw new Error('Пользователь не найден');
      }

      if (userToDelete.role === 'superadmin') {
        throw new Error('Нельзя удалить суперадмина');
      }

      this.users = this.users.filter(u => u.id !== userId);

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
  getAllUsers(requesterId) {
    try {
      const requester = this.users.find(u => u.id === requesterId);
      if (!requester || requester.role !== 'superadmin') {
        throw new Error('Только суперадмин может просматривать список пользователей');
      }

      return this.users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
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
      const user = this.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

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
      user.password = hashedNewPassword;

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
      const reseter = this.users.find(u => u.id === reseterId);
      if (!reseter || (reseter.role !== 'superadmin' && reseter.role !== 'full_access')) {
        throw new Error('Только суперадмин и пользователи с полным доступом могут сбрасывать пароли');
      }

      const userToReset = this.users.find(u => u.id === userId);
      if (!userToReset) {
        throw new Error('Пользователь не найден');
      }

      // Защита от сброса пароля суперадмина
      if (userToReset.role === 'superadmin' && userId !== reseterId) {
        throw new Error('Никто не может сбросить пароль суперадмина, кроме него самого');
      }

      // Генерируем новый безопасный пароль
      const newPassword = AuthService.generateSecurePassword(16);
      const hashedPassword = await AuthService.hashPassword(newPassword);

      // Обновляем пароль пользователя
      const userIndex = this.users.findIndex(u => u.id === userId);
      this.users[userIndex].password = hashedPassword;

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
  getUserById(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    };
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