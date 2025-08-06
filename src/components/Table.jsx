import React from 'react';
import Sidebar from './Sidebar';

export default function Table() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64">
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-4 pt-16 lg:pt-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Таблица рейсов</h1>
            <p className="text-sm text-gray-500">Детальная информация о рейсах</p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Здесь будет таблица */}
            <div className="p-4 sm:p-6">
              <p className="text-gray-500">Таблица находится в разработке</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 