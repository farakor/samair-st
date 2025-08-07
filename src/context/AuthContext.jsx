import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Утилиты для работы с токенами
const tokenUtils = {
  getToken: () => localStorage.getItem('authToken'),
  setToken: (token) => localStorage.setItem('authToken', token),
  removeToken: () => localStorage.removeItem('authToken'),

  // Получение заголовков авторизации
  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// Утилиты для API запросов
const apiUtils = {
  async request(url, options = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async get(url, options = {}) {
    return this.request(url, { method: 'GET', ...options });
  },

  async post(url, data, options = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async put(url, data, options = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async delete(url, options = {}) {
    return this.request(url, { method: 'DELETE', ...options });
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Инициализация и проверка токена
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 Инициализация AuthContext...');
      setLoading(true);

      const token = tokenUtils.getToken();
      if (token) {
        try {
          // Проверяем токен на сервере
          const response = await apiUtils.post('/auth/verify', { token });
          if (response.success) {
            console.log('✅ Токен действителен, восстанавливаем пользователя:', response.user.email);
            setCurrentUser(response.user);
          } else {
            console.log('⚠️ Недействительный токен, очищаем сессию');
            tokenUtils.removeToken();
          }
        } catch (error) {
          console.error('❌ Ошибка при проверке токена:', error);
          tokenUtils.removeToken();
        }
      }

      setIsInitialized(true);
      setLoading(false);
      console.log('✅ AuthContext инициализирован');
    };

    initializeAuth();
  }, []);

  // Автоматическое обновление списка пользователей для суперадмина
  useEffect(() => {
    const loadUsers = async () => {
      if (currentUser?.role === 'superadmin') {
        try {
          const response = await apiUtils.get('/auth/users');
          if (response.success) {
            setUsers(response.users);
          }
        } catch (error) {
          console.error('Ошибка загрузки пользователей:', error);
        }
      }
    };

    if (isInitialized && currentUser) {
      loadUsers();
    }
  }, [currentUser, isInitialized]);

  const login = async (email, password) => {
    try {
      console.log('🔑 Отправляем данные для входа:', { email, password: '***' });
      const response = await apiUtils.post('/auth/login', { email, password });

      if (response.success) {
        tokenUtils.setToken(response.token);
        setCurrentUser(response.user);
        console.log('✅ Успешный вход через API:', response.user.email);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      // Если API недоступно, показываем ошибку подключения
      if (error.message === 'Failed to fetch') {
        return { success: false, error: 'Сервер недоступен. Проверьте подключение к интернету.' };
      }
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // Уведомляем сервер о выходе (если доступен)
      await apiUtils.post('/auth/logout');
    } catch (error) {
      console.warn('Не удалось уведомить сервер о выходе:', error.message);
    } finally {
      // Очищаем только токен
      tokenUtils.removeToken();
      setCurrentUser(null);
      setUsers([]);
      console.log('✅ Выход из системы');
    }
  };

  const isSuperAdmin = () => {
    return currentUser?.role === 'superadmin';
  };

  const hasFullAccess = () => {
    return currentUser?.role === 'superadmin' || currentUser?.role === 'full_access';
  };

  const canAccessUpload = () => {
    return currentUser?.role === 'superadmin' || currentUser?.role === 'full_access';
  };

  const addUser = async (userData) => {
    try {
      const response = await apiUtils.post('/auth/users', userData);

      if (response.success) {
        // Обновляем список пользователей
        setUsers(prev => [...prev, response.user]);
        return {
          success: true,
          user: response.user,
          generatedPassword: response.generatedPassword
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      throw error;
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      const response = await apiUtils.put(`/auth/users/${userId}`, userData);

      if (response.success) {
        // Обновляем список пользователей
        setUsers(prev => prev.map(user =>
          user.id === userId ? response.user : user
        ));
        return { success: true, user: response.user };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      throw error;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await apiUtils.delete(`/auth/users/${userId}`);

      if (response.success) {
        // Удаляем пользователя из списка
        setUsers(prev => prev.filter(user => user.id !== userId));
        return { success: true };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      throw error;
    }
  };

  const getAllUsers = () => {
    return users;
  };

  // Смена пароля
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await apiUtils.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      return response;
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      throw error;
    }
  };

  // Сброс пароля пользователя
  const resetUserPassword = async (userId) => {
    try {
      const response = await apiUtils.post(`/auth/users/${userId}/reset-password`);

      if (response.success) {
        return {
          success: true,
          message: response.message,
          user: response.user
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Ошибка сброса пароля:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isInitialized,
      loading,
      login,
      logout,
      isSuperAdmin,
      hasFullAccess,
      canAccessUpload,
      addUser,
      updateUser,
      deleteUser,
      getAllUsers,
      changePassword,
      resetUserPassword,
      users,
      // Утилиты для API запросов
      apiUtils,
      tokenUtils
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 