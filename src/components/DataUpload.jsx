import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useFiles } from '../context/FilesContext';
import { useAuth } from '../context/AuthContext';

export default function DataUpload() {
  const [dragActive, setDragActive] = useState(false);
  const { uploadedFiles, addFiles, removeFile, filesCount, downloadOriginalFile, loadEmailFiles, getFlightStats } = useFiles();
  const { canAccessUpload } = useAuth();

  const stats = getFlightStats();

  // Проверяем права доступа
  if (!canAccessUpload()) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Доступ запрещен</p>
            <p className="text-sm mt-1">
              У вас нет прав для доступа к разделу "Загрузка данных".
              Для получения доступа обратитесь к администратору.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleChange = (e) => {
    e.preventDefault();
    const files = e.target.files;
    handleFiles(files);
    // Очищаем input для возможности повторного выбора того же файла
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    try {
      const newFiles = await addFiles(files);
      console.log("Файлы загружены:", newFiles);

      // Проверяем есть ли файлы с ошибками
      const errorFiles = newFiles.filter(file => file.status === 'error');
      if (errorFiles.length > 0) {
        console.warn(`${errorFiles.length} файл(ов) обработано с ошибками:`, errorFiles);
        alert(`Внимание! ${errorFiles.length} файл(ов) не удалось обработать. Проверьте детали в таблице ниже.`);
      }
    } catch (error) {
      console.error("Ошибка при загрузке файлов:", error);
      alert("Произошла ошибка при загрузке файлов. Проверьте консоль для подробностей.");
    }
  };

  // Функция для показа деталей ошибки
  const showErrorDetails = (file) => {
    let message = `Ошибка обработки файла: ${file.fileName}\n\n`;
    message += `Описание: ${file.error}\n\n`;

    if (file.errorDetails) {
      message += `Тип ошибки: ${file.errorDetails.name}\n`;
      if (file.errorDetails.stack) {
        message += `\nТехнические детали:\n${file.errorDetails.stack}`;
      }
    }

    alert(message);
  };

  // Функция для скачивания оригинального файла
  const handleDownload = async (file) => {
    try {
      await downloadOriginalFile(file.id, file.fileName);
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
      alert(`Не удалось скачать файл "${file.fileName}". Возможно, файл был поврежден или удален.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64 p-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Загрузка данных</h2>
          <p className="text-sm text-gray-500 mt-1">Загрузите файлы Excel для обработки данных</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего файлов</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ручные загрузки</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.manualFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Из почты</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.emailFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего рейсов</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFlights}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Область загрузки файлов */}
        <div
          className={`w-full h-48 mb-8 p-6 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} 
            transition-colors duration-200 ease-in-out`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <svg
              className="w-10 h-10 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-1 text-gray-900">
              <span className="font-semibold text-blue-600 hover:underline">
                Нажмите чтобы загрузить
              </span>{' '}
              или перетащите сюда файлы
            </p>
            <p className="text-sm text-gray-500">xls, xlsx (макс. 10MB)</p>
            <input
              id="fileInput"
              type="file"
              className="hidden"
              accept=".xls,.xlsx"
              onChange={handleChange}
              multiple
            />
          </div>
        </div>

        {/* Таблица загруженных файлов */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Загруженные файлы</h3>
                <p className="text-sm text-gray-500">Ручные загрузки и файлы из почты</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={async () => {
                    try {
                      await loadEmailFiles();
                      console.log('Файлы из почты обновлены');
                    } catch (error) {
                      console.error('Ошибка при обновлении файлов из почты:', error);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Обновить из почты
                </button>
                <div className="text-sm text-gray-600">
                  {filesCount} {filesCount === 1 ? 'файл' : filesCount < 5 ? 'файла' : 'файлов'}
                </div>
              </div>
            </div>
          </div>

          {filesCount === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="text-gray-500">Файлы еще не загружены</p>
              <p className="text-sm text-gray-400 mt-1">Загрузите файлы выше, чтобы увидеть их в этой таблице</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата загрузки
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Имя файла
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Размер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Источник
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadedFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {file.status === 'completed' ? (
                            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                          ) : file.status === 'error' ? (
                            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-yellow-500 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          <div className="flex flex-col">
                            <span>{file.fileName}</span>
                            {file.status === 'error' && (
                              <span className="text-xs text-red-500 mt-1" title={file.error}>
                                Ошибка: {file.error}
                              </span>
                            )}
                            {file.status === 'completed' && file.flightsCount !== undefined && (
                              <span className="text-xs text-gray-500 mt-1">
                                Обработано рейсов: {file.flightsCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {file.source === 'email' ? (
                            <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          )}
                          <div className="flex flex-col">
                            <span>{file.source === 'email' ? 'Почта' : 'Ручная загрузка'}</span>
                            <span className="text-xs text-gray-500">
                              {file.source === 'email' ? file.author : 'Текущий пользователь'}
                            </span>
                            {file.emailSubject && (
                              <span className="text-xs text-gray-400" title={file.emailSubject}>
                                Тема: {file.emailSubject.length > 30 ? file.emailSubject.substring(0, 30) + '...' : file.emailSubject}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {file.status === 'completed' && (
                            <button
                              onClick={() => handleDownload(file)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Скачать файл"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                              </svg>
                            </button>
                          )}
                          {file.status === 'error' && (
                            <button
                              onClick={() => showErrorDetails(file)}
                              className="text-orange-600 hover:text-orange-900 transition-colors"
                              title="Показать детали ошибки"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                await removeFile(file.id);
                              } catch (error) {
                                console.error('Ошибка при удалении файла:', error);
                                alert('Произошла ошибка при удалении файла');
                              }
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Удалить файл"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 