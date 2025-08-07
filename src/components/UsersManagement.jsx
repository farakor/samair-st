import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FilesContext';
import Sidebar from './Sidebar';

const ROLE_LABELS = {
  superadmin: 'Суперадмин',
  full_access: 'Полный доступ',
  read_only: 'Только чтение'
};

const UserModal = ({ isOpen, onClose, onSave, user = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'read_only'
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        email: user.email,
        name: user.name,
        role: user.role
      });
    } else {
      setFormData({
        email: '',
        name: '',
        role: 'read_only'
      });
    }
    setErrors({});
    setIsLoading(false); // Сбрасываем состояние загрузки при открытии/закрытии модального окна
  }, [user, isEdit, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'ФИО обязательно';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      try {
        await onSave(formData);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {isEdit ? 'Редактировать пользователя' : 'Добавить пользователя'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="example@email.com"
              disabled={isEdit && user?.role === 'superadmin'}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ФИО
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Иванов Иван Иванович"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Права доступа
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isEdit && user?.role === 'superadmin'}
            >
              <option value="read_only">Только чтение</option>
              <option value="full_access">Полный доступ</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.role === 'read_only'
                ? 'Без доступа к разделу "Загрузка данных"'
                : 'Полный доступ ко всем разделам'
              }
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-white rounded-md flex items-center justify-center min-w-[100px] ${isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#1B3B7B] hover:bg-[#152f61]'
                }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Загрузка...
                </>
              ) : (
                isEdit ? 'Сохранить' : 'Добавить'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CredentialsModal = ({ isOpen, onClose, credentials }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `Email: ${credentials?.email}\nПароль: ${credentials?.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !credentials) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-green-600">
          Пользователь успешно создан!
        </h2>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800 mb-3">
            Учетные данные отправлены на почту пользователя:
          </p>

          <div className="space-y-2">
            <div>
              <span className="font-medium text-green-900">Email:</span>
              <span className="ml-2 font-mono">{credentials.email}</span>
            </div>
            <div>
              <span className="font-medium text-green-900">Пароль:</span>
              <span className="ml-2 font-mono">{credentials.password}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1B3B7B] text-white rounded-md hover:bg-[#152f61]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default function UsersManagement() {
  const { getAllUsers, addUser, updateUser, deleteUser, resetUserPassword, isSuperAdmin, hasFullAccess, users: contextUsers, apiUtils } = useAuth();
  const { clearAllFiles } = useFiles();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [error, setError] = useState('');
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);

  const loadUsers = useCallback(() => {
    try {
      const usersList = getAllUsers();
      setUsers(usersList);
    } catch (error) {
      setError(error.message);
    }
  }, [getAllUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Синхронизируем локальное состояние с контекстом
  useEffect(() => {
    if (contextUsers && contextUsers.length > 0) {
      setUsers(contextUsers);
    }
  }, [contextUsers]);

  const handleAddUser = () => {
    setEditingUser(null);
    setIsEdit(false);
    setIsModalOpen(true);
    setError('');
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEdit(true);
    setIsModalOpen(true);
    setError('');
  };

  const handleSaveUser = async (userData) => {
    setIsOperationInProgress(true);
    try {
      if (isEdit) {
        updateUser(editingUser.id, userData);
        setError('');
      } else {
        const result = await addUser(userData);
        setNewCredentials({
          email: result.user.email,
          password: result.generatedPassword
        });
        setShowCredentials(true);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (error) {
      setError(error.message);
      throw error; // Прокидываем ошибку чтобы модальное окно могло обработать состояние загрузки
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?`)) {
      try {
        deleteUser(userId);
        loadUsers();
        setError('');
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleResetPassword = async (userId, userName, userRole) => {
    // Проверяем права доступа
    if (!hasFullAccess()) {
      setError('У вас нет прав для сброса паролей');
      return;
    }

    // Защита от сброса пароля суперадмина
    if (userRole === 'superadmin') {
      setError('Нельзя сбросить пароль суперадмина');
      return;
    }

    if (window.confirm(`Вы уверены, что хотите сбросить пароль пользователя "${userName}"?\n\nНовый пароль будет отправлен на email пользователя.`)) {
      setIsOperationInProgress(true);
      try {
        const result = await resetUserPassword(userId);
        setError('');
        alert(`Пароль пользователя "${userName}" успешно сброшен.\nНовый пароль отправлен на email: ${result.user.email}`);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsOperationInProgress(false);
      }
    }
  };

  const handleClearUserData = async () => {
    // Проверяем права доступа
    if (!hasFullAccess()) {
      setError('У вас нет прав для выполнения этой операции');
      return;
    }

    const confirmMessage = `🚨 ВНИМАНИЕ! 

Эта операция полностью удалит ВСЕ пользовательские данные:
• Все рейсы из базы данных
• Все загруженные файлы
• Все email логи

ЭТО ДЕЙСТВИЕ НЕОБРАТИМО!

Введите "УДАЛИТЬ" для подтверждения:`;

    const confirmation = window.prompt(confirmMessage);

    if (confirmation !== 'УДАЛИТЬ') {
      return;
    }

    setIsOperationInProgress(true);
    try {
      const response = await apiUtils.post('/clear-user-data', {});

      if (response.success) {
        const stats = response.data;

        // Также очищаем клиентские данные (IndexedDB, localStorage)
        try {
          await clearAllFiles();
          console.log('✅ Клиентские данные также очищены');
        } catch (clientError) {
          console.error('⚠️ Ошибка очистки клиентских данных:', clientError);
        }

        alert(`✅ Очистка данных завершена успешно!

Серверные данные:
• Рейсов: ${stats.clearedFlights}
• Записей о файлах: ${stats.clearedFileRecords}
• Физических файлов: ${stats.deletedFiles}
• Email логи: очищены

Клиентские данные:
• IndexedDB: очищен
• localStorage: очищен

Система готова к загрузке новых данных.`);
        setError('');
      } else {
        throw new Error(response.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Ошибка очистки данных:', error);
      setError(`Ошибка очистки данных: ${error.message}`);
    } finally {
      setIsOperationInProgress(false);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
            Доступ запрещен. Только суперадмин может управлять пользователями.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 sm:p-8 pt-20 lg:pt-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
            Пользователи и права
          </h1>
          <p className="text-gray-600">
            Управление пользователями и их правами доступа к системе
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Список пользователей
              </h2>
              <button
                onClick={handleAddUser}
                disabled={isOperationInProgress}
                className={`px-4 py-2 text-white rounded-md flex items-center ${isOperationInProgress
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#1B3B7B] hover:bg-[#152f61]'
                  }`}
              >
                {isOperationInProgress ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Обработка...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Добавить пользователя
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Права доступа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-[#1B3B7B] flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          {user.role === 'superadmin' && (
                            <div className="text-xs text-orange-600 font-medium">
                              Суперадминистратор
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'superadmin'
                        ? 'bg-orange-100 text-orange-800'
                        : user.role === 'full_access'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.role !== 'superadmin' && hasFullAccess() && (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                            disabled={isOperationInProgress}
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id, user.name, user.role)}
                            className="text-yellow-600 hover:text-yellow-900"
                            disabled={isOperationInProgress}
                          >
                            Сбросить пароль
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isOperationInProgress}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                      {user.role === 'superadmin' && (
                        <span className="text-gray-400">Защищен</span>
                      )}
                      {user.role !== 'superadmin' && !hasFullAccess() && (
                        <span className="text-gray-400">Нет прав</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Секция системных операций */}
        {hasFullAccess() && (
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Системные операции</h3>
              <p className="text-sm text-gray-500">Опасные операции, доступные только суперадминистраторам</p>
            </div>
            <div className="p-6">
              <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-red-800">Очистка пользовательских данных</h4>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Эта операция полностью удалит:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Все данные рейсов из базы данных</li>
                        <li>Все загруженные файлы</li>
                        <li>Все email логи</li>
                      </ul>
                      <p className="mt-2 font-medium">⚠️ Это действие необратимо!</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={handleClearUserData}
                        disabled={isOperationInProgress}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isOperationInProgress ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Очистка...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Очистить все пользовательские данные
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveUser}
          user={editingUser}
          isEdit={isEdit}
        />

        <CredentialsModal
          isOpen={showCredentials}
          onClose={() => setShowCredentials(false)}
          credentials={newCredentials}
        />
      </div>
    </div>
  );
} 