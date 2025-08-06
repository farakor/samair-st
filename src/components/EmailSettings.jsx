import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function EmailSettings() {
  const [activeTab, setActiveTab] = useState('imap');
  const [config, setConfig] = useState({
    host: '',
    port: 993,
    user: '',
    password: '',
    tls: true
  });
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    secure: false,
    fromName: 'SamAir System'
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [smtpMessage, setSmtpMessage] = useState('');
  const [smtpMessageType, setSmtpMessageType] = useState('');
  const { canAccessUpload } = useAuth();

  const loadConfig = useCallback(async () => {
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
  }, []);

  const loadSMTPConfig = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/smtp-config');
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setSmtpConfig(prevConfig => ({
            ...prevConfig,
            ...data
          }));
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке SMTP конфигурации:', error);
    }
  }, []);

  // Загружаем текущую конфигурацию при монтировании
  useEffect(() => {
    if (canAccessUpload()) {
      loadConfig();
      loadSMTPConfig();
    }
  }, [canAccessUpload, loadConfig, loadSMTPConfig]);

  // Проверяем права доступа
  if (!canAccessUpload()) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-64 p-4 sm:p-8 pt-20 lg:pt-8">
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'port' ? parseInt(value) || 993 : value)
    }));
  };

  const handleSMTPInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'port' ? parseInt(value) || 587 : value)
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

  const testSMTPConnection = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
      setSmtpMessage('Заполните все обязательные поля');
      setSmtpMessageType('error');
      return;
    }

    setSmtpTesting(true);
    setSmtpMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/test-smtp-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(smtpConfig),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSmtpMessage('SMTP подключение прошло успешно!');
        setSmtpMessageType('success');
      } else {
        setSmtpMessage(result.error || 'Ошибка при тестировании SMTP подключения');
        setSmtpMessageType('error');
      }
    } catch (error) {
      setSmtpMessage(`Ошибка: ${error.message}`);
      setSmtpMessageType('error');
    } finally {
      setSmtpTesting(false);
    }
  };

  const saveSMTPConfig = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
      setSmtpMessage('Заполните все обязательные поля');
      setSmtpMessageType('error');
      return;
    }

    setSmtpLoading(true);
    setSmtpMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/smtp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(smtpConfig),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSmtpMessage('SMTP настройки сохранены успешно!');
        setSmtpMessageType('success');
      } else {
        setSmtpMessage(result.error || 'Ошибка при сохранении SMTP настроек');
        setSmtpMessageType('error');
      }
    } catch (error) {
      setSmtpMessage(`Ошибка: ${error.message}`);
      setSmtpMessageType('error');
    } finally {
      setSmtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:ml-64 p-4 sm:p-6 pt-20 lg:pt-6">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Настройки почты</h2>
          <p className="text-sm text-gray-500 mt-1">
            Настройте подключение к почте и SMTP для отправки уведомлений
          </p>
        </div>

        {/* Вкладки */}
        <div className="max-w-4xl">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('imap')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'imap'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                IMAP (Получение)
              </button>
              <button
                onClick={() => setActiveTab('smtp')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'smtp'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                SMTP (Отправка)
              </button>
            </nav>
          </div>

          {/* IMAP Вкладка */}
          {activeTab === 'imap' && (
            <>
              {/* Сообщения IMAP */}
              {message && (
                <div className={`mb-6 p-4 rounded-lg ${messageType === 'success'
                  ? 'bg-green-100 border border-green-300 text-green-700'
                  : 'bg-red-100 border border-red-300 text-red-700'
                  }`}>
                  <p className="font-medium">{messageType === 'success' ? 'Успех!' : 'Ошибка!'}</p>
                  <p className="text-sm mt-1">{message}</p>
                </div>
              )}

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

                {/* Информация IMAP */}
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
            </>
          )}

          {/* SMTP Вкладка */}
          {activeTab === 'smtp' && (
            <>
              {/* Сообщения SMTP */}
              {smtpMessage && (
                <div className={`mb-6 p-4 rounded-lg ${smtpMessageType === 'success'
                  ? 'bg-green-100 border border-green-300 text-green-700'
                  : 'bg-red-100 border border-red-300 text-red-700'
                  }`}>
                  <p className="font-medium">{smtpMessageType === 'success' ? 'Успех!' : 'Ошибка!'}</p>
                  <p className="text-sm mt-1">{smtpMessage}</p>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">SMTP настройки</h3>

                <div className="space-y-6">
                  {/* Хост SMTP */}
                  <div>
                    <label htmlFor="smtp-host" className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Сервер <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="smtp-host"
                      name="host"
                      value={smtpConfig.host}
                      onChange={handleSMTPInputChange}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Например: smtp.gmail.com, smtp.yandex.ru, smtp.office365.com
                    </p>
                  </div>

                  {/* Порт SMTP */}
                  <div>
                    <label htmlFor="smtp-port" className="block text-sm font-medium text-gray-700 mb-2">
                      Порт
                    </label>
                    <input
                      type="number"
                      id="smtp-port"
                      name="port"
                      value={smtpConfig.port}
                      onChange={handleSMTPInputChange}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Обычно 587 для SMTP с STARTTLS, 465 для SMTP с SSL
                    </p>
                  </div>

                  {/* Email SMTP */}
                  <div>
                    <label htmlFor="smtp-user" className="block text-sm font-medium text-gray-700 mb-2">
                      Email адрес <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="smtp-user"
                      name="user"
                      value={smtpConfig.user}
                      onChange={handleSMTPInputChange}
                      placeholder="your-email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Пароль SMTP */}
                  <div>
                    <label htmlFor="smtp-password" className="block text-sm font-medium text-gray-700 mb-2">
                      Пароль <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="smtp-password"
                      name="password"
                      value={smtpConfig.password}
                      onChange={handleSMTPInputChange}
                      placeholder="Введите пароль"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Для Gmail используйте пароль приложения
                    </p>
                  </div>

                  {/* Имя отправителя */}
                  <div>
                    <label htmlFor="smtp-from-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Имя отправителя
                    </label>
                    <input
                      type="text"
                      id="smtp-from-name"
                      name="fromName"
                      value={smtpConfig.fromName}
                      onChange={handleSMTPInputChange}
                      placeholder="SamAir System"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Это имя будет отображаться как отправитель писем
                    </p>
                  </div>

                  {/* Secure */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="smtp-secure"
                      name="secure"
                      checked={smtpConfig.secure}
                      onChange={handleSMTPInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="smtp-secure" className="ml-2 block text-sm text-gray-700">
                      Использовать SSL (порт 465)
                    </label>
                  </div>
                </div>

                {/* Кнопки SMTP */}
                <div className="mt-8 flex space-x-4">
                  <button
                    onClick={testSMTPConnection}
                    disabled={smtpTesting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {smtpTesting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Тестируем...
                      </>
                    ) : (
                      'Тестировать SMTP'
                    )}
                  </button>

                  <button
                    onClick={saveSMTPConfig}
                    disabled={smtpLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {smtpLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Сохраняем...
                      </>
                    ) : (
                      'Сохранить SMTP'
                    )}
                  </button>
                </div>

                {/* Информация SMTP */}
                <div className="mt-8 p-4 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Важная информация:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• SMTP используется для отправки паролей новым пользователям</li>
                    <li>• При создании пользователя автоматически отправляется приветственное письмо</li>
                    <li>• Для Gmail включите двухфакторную аутентификацию и создайте пароль приложения</li>
                    <li>• Убедитесь, что SMTP включен в настройках вашего почтового сервиса</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}