import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import TablePage from './components/TablePage';
import DataUpload from './components/DataUpload';
import UsersManagement from './components/UsersManagement';
import EmailSettings from './components/EmailSettings';
import EmailLogs from './components/EmailLogs';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FilesProvider } from './context/FilesContext';

function PrivateRoute({ children }) {
  const { isAuthenticated, isInitialized } = useAuth();

  // Показываем загрузку до завершения инициализации
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Инициализация системы...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <FilesProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/table"
              element={
                <PrivateRoute>
                  <TablePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <PrivateRoute>
                  <DataUpload />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <UsersManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/email-settings"
              element={
                <PrivateRoute>
                  <EmailSettings />
                </PrivateRoute>
              }
            />
            <Route
              path="/email-logs"
              element={
                <PrivateRoute>
                  <EmailLogs />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </FilesProvider>
    </AuthProvider>
  );
}

export default App; 