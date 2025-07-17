import React from 'react';
import Sidebar from './Sidebar';

export default function Table() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <div className="bg-white border-b">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Таблица рейсов</h1>
            <p className="text-sm text-gray-500">Детальная информация о рейсах</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Здесь будет таблица */}
            <div className="p-6">
              <p className="text-gray-500">Таблица находится в разработке</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 