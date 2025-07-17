import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { logout, isSuperAdmin, canAccessUpload } = useAuth();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-white h-screen flex flex-col border-r fixed left-0 top-0 z-10">
      <div className="p-4 mb-1 flex justify-center">
        <img src="/logo.png" alt="Air Samarkand" className="h-8" />
      </div>

      <nav className="flex-1">
        <Link
          to="/"
          className={`flex items-center px-4 py-3 text-sm ${isActive('/') ? 'bg-[#1B3B7B] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Дашборд
        </Link>

        <Link
          to="/table"
          className={`flex items-center px-4 py-3 text-sm ${isActive('/table') ? 'bg-[#1B3B7B] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Таблица
        </Link>

        {/* Раздел загрузки данных - только для пользователей с полным доступом */}
        {canAccessUpload() && (
          <Link
            to="/upload"
            className={`flex items-center px-4 py-3 text-sm ${isActive('/upload') ? 'bg-[#1B3B7B] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Загрузка данных
          </Link>
        )}

        {/* Настройки почты - только для пользователей с полным доступом */}
        {canAccessUpload() && (
          <Link
            to="/email-settings"
            className={`flex items-center px-4 py-3 text-sm ${isActive('/email-settings') ? 'bg-[#1B3B7B] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Настройки почты
          </Link>
        )}

        {/* Логи почты - только для пользователей с полным доступом */}
        {canAccessUpload() && (
          <Link
            to="/email-logs"
            className={`flex items-center px-4 py-3 text-sm ${isActive('/email-logs') ? 'bg-[#1B3B7B] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Логи почты
          </Link>
        )}

        {/* Раздел управления пользователями - только для суперадмина */}
        {isSuperAdmin() && (
          <Link
            to="/users"
            className={`flex items-center px-4 py-3 text-sm ${isActive('/users') ? 'bg-[#1B3B7B] text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Пользователи и права
          </Link>
        )}
      </nav>

      {/* Кнопка выхода */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Выйти</span>
        </button>
      </div>
    </div>
  );
} 