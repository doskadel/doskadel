import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Компоненты
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Diary from './components/Diary';
import Search from './components/Search';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/search" element={<Search />} />
      </Routes>
    </div>
  );
}

export default App;