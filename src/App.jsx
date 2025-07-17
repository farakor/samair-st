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
  const { isAuthenticated } = useAuth();
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