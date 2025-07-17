import React, { useState, useMemo } from 'react';
import { useFiles } from '../context/FilesContext';


export default function FlightsTable() {
  const { getFlightData, getFlightStats, flightsCount } = useFiles();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});
  const itemsPerPage = 25; // Увеличиваем количество элементов на странице

  // Используем useMemo для стабильности данных
  const flightData = useMemo(() => getFlightData(filters), [filters, getFlightData]);
  const stats = useMemo(() => getFlightStats(), [getFlightStats]);

  const totalPages = Math.ceil(flightData.length / itemsPerPage);

  // Мемоизируем данные для текущей страницы
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return flightData.slice(startIndex, startIndex + itemsPerPage);
  }, [flightData, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Прокручиваем в начало таблицы при смене страницы
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Вычисляем показатели для отображения
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, flightData.length);

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок таблицы */}
      <div className="p-6 bg-white border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Таблица рейсов</h2>
            <p className="text-sm text-gray-500">Информация по выполненным рейсам из загруженных файлов</p>
            <div className="mt-2 flex gap-4 text-sm text-gray-600">
              <span>Всего рейсов: <strong>{flightsCount}</strong></span>
              <span>Файлов обработано: <strong>{stats.completedFiles}</strong></span>
              {stats.errorFiles > 0 && (
                <span className="text-red-600">Ошибок: <strong>{stats.errorFiles}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Контейнер для таблицы с прокруткой */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип ВС
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Вылет
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Прилет
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время отпр (факт)
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время приб (факт)
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время в пути (факт)
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Компон.
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ADLT+ CHLD+INF
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % PAX
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Баг. кг.
                </th>
                <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Летчики
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      {flightsCount === 0 ? (
                        <div>
                          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          <p className="text-lg font-medium text-gray-900 mb-2">Нет данных рейсов</p>
                          <p className="text-gray-500">Загрузите Excel файлы в разделе "Загрузка данных"</p>
                        </div>
                      ) : (
                        <p>Нет данных для отображения на этой странице</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((flight, index) => (
                  <tr key={`${flight.id}-${currentPage}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.aircraftType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.departure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.arrival}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.departureTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.arrivalTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.flightTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.configuration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.passengers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.paxPercentage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flight.baggage}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {flight.crew}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пагинация */}
      {flightsCount > 0 && (
        <div className="bg-white px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Показано {startIndex + 1}-{endIndex} из {flightData.length} записей
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <svg className="w-5 h-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Предыдущая
              </button>

              <div className="flex items-center space-x-2">
                {(() => {
                  const pages = [];
                  const showPages = 5; // Максимум показываем 5 кнопок страниц

                  // Всегда показываем первую страницу
                  if (totalPages > 0) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${currentPage === 1
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                  }

                  // Добавляем многоточие если нужно
                  if (currentPage > 3 && totalPages > showPages) {
                    pages.push(<span key="dots1" className="px-2 text-gray-500">...</span>);
                  }

                  // Показываем страницы вокруг текущей
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);

                  for (let i = start; i <= end; i++) {
                    if (i !== 1 && i !== totalPages) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${currentPage === i
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }
                  }

                  // Добавляем многоточие если нужно
                  if (currentPage < totalPages - 2 && totalPages > showPages) {
                    pages.push(<span key="dots2" className="px-2 text-gray-500">...</span>);
                  }

                  // Всегда показываем последнюю страницу
                  if (totalPages > 1) {
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${currentPage === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Следующая
                <svg className="w-5 h-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}