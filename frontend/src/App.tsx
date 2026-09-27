import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import TaskDetail from './components/TaskDetail';
import Knowledge from './components/Knowledge';
import ArticleDetail from './components/ArticleDetail';
import Search from './components/Search';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { getToken } from './utils/token';

function App() {
  const token = getToken();

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetail /></Layout></ProtectedRoute>} />
        <Route path="/knowledge" element={<ProtectedRoute><Layout><Knowledge /></Layout></ProtectedRoute>} />
        <Route path="/knowledge/:id" element={<ProtectedRoute><Layout><ArticleDetail /></Layout></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Layout><Search /></Layout></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;