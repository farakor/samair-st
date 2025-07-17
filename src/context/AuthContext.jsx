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
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('systemUsers');
    return savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
  });

  // Сохраняем пользователей в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('systemUsers', JSON.stringify(users));
  }, [users]);

  // Проверяем, залогинен ли пользователь при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

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

  const addUser = (userData) => {
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

    // Возвращаем пароль для отображения (в реальной системе отправляли бы на email)
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