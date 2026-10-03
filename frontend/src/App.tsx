import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { ConfirmProvider } from './components/ConfirmProvider';
import { ToastProvider } from './components/Toast';
import LoadingOverlay from './components/LoadingOverlay';
import { getToken } from './utils/token';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Tasks = lazy(() => import('./components/Tasks'));
const TaskDetail = lazy(() => import('./components/TaskDetail'));
const Knowledge = lazy(() => import('./components/Knowledge'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const MorePage = lazy(() => import('./components/MorePage'));

function App() {
  const token = getToken();

  return (
    <ConfirmProvider>
      <ToastProvider>
      <div className="App">
        <Suspense fallback={<LoadingOverlay active text="Загрузка..." />}>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
          <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetail /></Layout></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute><Layout><Knowledge /></Layout></ProtectedRoute>} />
          <Route path="/knowledge/:id" element={<ProtectedRoute><Layout><ArticleDetail /></Layout></ProtectedRoute>} />
          <Route path="/more" element={<ProtectedRoute><Layout><MorePage /></Layout></ProtectedRoute>} />
          <Route path="/search" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}

export default App;