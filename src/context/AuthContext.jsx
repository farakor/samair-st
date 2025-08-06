import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Изначальные пользователи системы
const INITIAL_USERS = [
  {
    id: 1,
    email: 'farrukh.oripov@gmail.com',
    name: 'Орипов Фаррух',
    role: 'superadmin',
    password: 'admin123' // В реальной системе пароли должны быть хешированы
  }
];

// Функция генерации случайного пароля
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализация пользователей и сессии
  useEffect(() => {
    console.log('🔄 Инициализация AuthContext...');

    // Загружаем пользователей из localStorage
    const savedUsers = localStorage.getItem('systemUsers');
    const loadedUsers = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
    setUsers(loadedUsers);

    // Восстанавливаем текущего пользователя
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Проверяем, существует ли такой пользователь в системе
        const existingUser = loadedUsers.find(u => u.id === user.id && u.email === user.email);
        if (existingUser) {
          console.log('✅ Восстанавливаем пользователя из localStorage:', user.email);
          setCurrentUser(user);
        } else {
          console.log('⚠️ Пользователь из localStorage не найден в системе, очищаем сессию');
          localStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('❌ Ошибка при восстановлении пользователя из localStorage:', error);
        localStorage.removeItem('currentUser');
      }
    }

    setIsInitialized(true);
    console.log('✅ AuthContext инициализирован');
  }, []);

  // Сохраняем пользователей в localStorage при изменении (только после инициализации)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('systemUsers', JSON.stringify(users));
      console.log('💾 Пользователи сохранены в localStorage');
    }
  }, [users, isInitialized]);

  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      setCurrentUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
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
    if (!isSuperAdmin()) {
      throw new Error('Только суперадмин может добавлять пользователей');
    }

    // Проверяем, что пользователь с таким email не существует
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const password = generatePassword();
    const newUser = {
      id: Date.now(),
      email: userData.email,
      name: userData.name,
      role: userData.role,
      password: password
    };

    setUsers(prev => [...prev, newUser]);

    // Отправляем приветственное письмо
    try {
      const response = await fetch('http://localhost:3001/api/send-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: newUser.email,
          userName: newUser.name,
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка отправки приветственного письма:', errorData.error);
        // Не прерываем создание пользователя, просто логируем ошибку
      } else {
        const result = await response.json();
        console.log('Приветственное письмо отправлено:', result.message);
      }
    } catch (error) {
      console.error('Ошибка при отправке приветственного письма:', error);
      // Не прерываем создание пользователя, просто логируем ошибку
    }

    // Возвращаем пароль для отображения 
    return { ...newUser, generatedPassword: password };
  };

  const updateUser = (userId, userData) => {
    if (!isSuperAdmin()) {
      throw new Error('Только суперадмин может изменять пользователей');
    }

    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, ...userData }
        : user
    ));
  };

  const deleteUser = (userId) => {
    if (!isSuperAdmin()) {
      throw new Error('Только суперадмин может удалять пользователей');
    }

    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.role === 'superadmin') {
      throw new Error('Нельзя удалить суперадмина');
    }

    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const getAllUsers = () => {
    if (!isSuperAdmin()) {
      throw new Error('Только суперадмин может просматривать список пользователей');
    }

    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isInitialized,
      login,
      logout,
      isSuperAdmin,
      hasFullAccess,
      canAccessUpload,
      addUser,
      updateUser,
      deleteUser,
      getAllUsers
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