import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function EmailSettings() {
  const [config, setConfig] = useState({
    host: '',
    port: 993,
    user: '',
    password: '',
    tls: true
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const { canAccessUpload } = useAuth();

  // Проверяем права доступа
  if (!canAccessUpload()) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Доступ запрещен</p>
            <p className="text-sm mt-1">
              У вас нет прав для доступа к настройкам почты.
              Для получения доступа обратитесь к администратору.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Загружаем текущую конфигурацию при монтировании
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/email-config');
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setConfig(prevConfig => ({
            ...prevConfig,
            ...data
          }));
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке конфигурации:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'port' ? parseInt(value) || 993 : value)
    }));
  };

  const testConnection = async () => {
    if (!config.host || !config.user || !config.password) {
      setMessage('Заполните все обязательные поля');
      setMessageType('error');
      return;
    }

    setTesting(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/test-email-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage('Подключение к почте прошло успешно!');
        setMessageType('success');
      } else {
        setMessage(result.error || 'Ошибка при тестировании подключения');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`Ошибка: ${error.message}`);
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!config.host || !config.user || !config.password) {
      setMessage('Заполните все обязательные поля');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage('Настройки почты сохранены успешно!');
        setMessageType('success');
      } else {
        setMessage(result.error || 'Ошибка при сохранении настроек');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`Ошибка: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64 p-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Настройки почты</h2>
          <p className="text-sm text-gray-500 mt-1">
            Настройте подключение к почте для автоматического получения XLS файлов
          </p>
        </div>

        {/* Сообщения */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${messageType === 'success'
              ? 'bg-green-100 border border-green-300 text-green-700'
              : 'bg-red-100 border border-red-300 text-red-700'
            }`}>
            <p className="font-medium">{messageType === 'success' ? 'Успех!' : 'Ошибка!'}</p>
            <p className="text-sm mt-1">{message}</p>
          </div>
        )}

        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">IMAP настройки</h3>

            <div className="space-y-6">
              {/* Хост */}
              <div>
                <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-2">
                  Сервер IMAP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="host"
                  name="host"
                  value={config.host}
                  onChange={handleInputChange}
                  placeholder="imap.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Например: imap.gmail.com, imap.yandex.ru, outlook.office365.com
                </p>
              </div>

              {/* Порт */}
              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
                  Порт
                </label>
                <input
                  type="number"
                  id="port"
                  name="port"
                  value={config.port}
                  onChange={handleInputChange}
                  placeholder="993"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Обычно 993 для IMAP с SSL/TLS
                </p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                  Email адрес <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="user"
                  name="user"
                  value={config.user}
                  onChange={handleInputChange}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Пароль */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={config.password}
                  onChange={handleInputChange}
                  placeholder="Введите пароль"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Для Gmail используйте пароль приложения, а не основной пароль аккаунта
                </p>
              </div>

              {/* TLS */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tls"
                  name="tls"
                  checked={config.tls}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="tls" className="ml-2 block text-sm text-gray-700">
                  Использовать TLS/SSL (рекомендуется)
                </label>
              </div>
            </div>

            {/* Кнопки */}
            <div className="mt-8 flex space-x-4">
              <button
                onClick={testConnection}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Тестируем...
                  </>
                ) : (
                  'Тестировать подключение'
                )}
              </button>

              <button
                onClick={saveConfig}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохраняем...
                  </>
                ) : (
                  'Сохранить настройки'
                )}
              </button>
            </div>

            {/* Информация */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Важная информация:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Система будет проверять почту каждый день в 9:00 утра</li>
                <li>• Обрабатываются только письма с XLS/XLSX вложениями</li>
                <li>• Для Gmail включите двухфакторную аутентификацию и создайте пароль приложения</li>
                <li>• Убедитесь, что IMAP включен в настройках вашего почтового клиента</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 