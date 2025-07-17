import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [manualFetchLoading, setManualFetchLoading] = useState(false);
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
              У вас нет прав для доступа к логам почты.
              Для получения доступа обратитесь к администратору.
            </p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadLogs();
    loadStatus();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/email-logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке логов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/email-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке статуса:', error);
    }
  };

  const manualFetch = async () => {
    setManualFetchLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/fetch-emails-manual', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();

        // Показываем результат
        if (result.totalFiles > 0) {
          alert(`Успешно получено ${result.totalFiles} файл(ов) из ${result.totalEmails} писем.`);
        } else {
          alert(`Обработано ${result.totalEmails} писем, но новых файлов не найдено.`);
        }

        // Обновляем логи
        await loadLogs();
        await loadStatus();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      alert(`Ошибка при получении писем: ${error.message}`);
    } finally {
      setManualFetchLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64 p-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Логи автоматического получения писем</h2>
          <p className="text-sm text-gray-500 mt-1">
            Просмотр результатов автоматического получения XLS файлов из почты
          </p>
        </div>

        {/* Статус и управление */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Статус автоматического сбора</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Статус</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {status.isEnabled ? 'Включен' : 'Отключен'}
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Последний запуск</p>
                  <p className="text-lg font-semibold text-green-900">
                    {status.lastRun ? formatDate(status.lastRun) : 'Не запускался'}
                  </p>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Всего писем</p>
                  <p className="text-lg font-semibold text-purple-900">{status.totalEmails || 0}</p>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Файлов получено</p>
                  <p className="text-lg font-semibold text-orange-900">{status.totalFiles || 0}</p>
                </div>
              </div>

              {status.nextRun && (
                <p className="text-sm text-gray-600 mt-4">
                  Следующий автоматический запуск: {formatDate(status.nextRun)}
                </p>
              )}
            </div>

            <button
              onClick={manualFetch}
              disabled={manualFetchLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {manualFetchLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Получаем...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Запустить вручную
                </>
              )}
            </button>
          </div>
        </div>

        {/* Логи */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">История операций</h3>
              <p className="text-sm text-gray-500">Последние {logs.length} записей</p>
            </div>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {loading ? 'Обновляем...' : 'Обновить'}
            </button>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-center">
              <svg className="animate-spin w-8 h-8 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500">Загружаем логи...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <p className="text-gray-500">Логи пока отсутствуют</p>
              <p className="text-sm text-gray-400 mt-1">
                Запустите получение писем вручную или дождитесь автоматического запуска
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {log.message}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(log.timestamp)}
                        </p>
                      </div>
                      {log.error && (
                        <p className="text-sm text-red-600 mt-1">
                          Ошибка: {log.error}
                        </p>
                      )}
                      {log.details && (
                        <div className="text-sm text-gray-600 mt-2">
                          {log.details.processedFiles && log.details.processedFiles.length > 0 && (
                            <div>
                              <p className="font-medium">Обработанные файлы:</p>
                              <ul className="list-disc list-inside ml-4 mt-1">
                                {log.details.processedFiles.map((file, fileIndex) => (
                                  <li key={fileIndex}>
                                    {file.filename} ({file.size} байт) от {file.from}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {log.details.errors && log.details.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium text-red-600">Ошибки:</p>
                              <ul className="list-disc list-inside ml-4 mt-1">
                                {log.details.errors.map((error, errorIndex) => (
                                  <li key={errorIndex} className="text-red-600">
                                    {error.filename ? `${error.filename}: ${error.error}` : error.message || error.error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Информация */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Информация:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Система автоматически проверяет почту каждый день в 9:00 утра</li>
            <li>• Обрабатываются письма за последние 7 дней с XLS/XLSX вложениями</li>
            <li>• Логи показывают только последние 100 записей</li>
            <li>• Для ручного запуска проверки нажмите кнопку "Запустить вручную"</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 