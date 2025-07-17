import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
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
              className="px-4 py-2 bg-[#1B3B7B] text-white rounded-md hover:bg-[#152f61]"
            >
              {isEdit ? 'Сохранить' : 'Добавить'}
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
  const { getAllUsers, addUser, updateUser, deleteUser, isSuperAdmin, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    try {
      const usersList = getAllUsers();
      setUsers(usersList);
    } catch (error) {
      setError(error.message);
    }
  };

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
    try {
      if (isEdit) {
        updateUser(editingUser.id, userData);
        setError('');
      } else {
        const result = addUser(userData);
        setNewCredentials({
          email: result.email,
          password: result.generatedPassword
        });
        setShowCredentials(true);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (error) {
      setError(error.message);
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
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
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
                className="bg-[#1B3B7B] text-white px-4 py-2 rounded-md hover:bg-[#152f61] flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить пользователя
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
                      {user.role !== 'superadmin' && (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                      {user.role === 'superadmin' && (
                        <span className="text-gray-400">Защищен</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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