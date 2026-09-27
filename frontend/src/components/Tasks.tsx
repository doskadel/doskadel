import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  createdAt: string;
}

const statusMap: Record<string, string> = {
  pending: 'В ожидании',
  in_progress: 'В работе',
  completed: 'Выполнено',
  cancelled: 'Отменено',
};

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [priority, setPriority] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data.tasks);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/tasks', {
        title,
        description,
        status,
        priority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority(1);
      fetchTasks();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <h2>Мои задачи</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          required
        />
        <textarea
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          rows={3}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="input"
        >
          <option value="pending">В ожидании</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Выполнено</option>
          <option value="cancelled">Отменено</option>
        </select>
        <input
          type="number"
          min="1"
          max="5"
          placeholder="Приоритет (1-5)"
          value={priority}
          onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
          className="input"
          required
        />
        <button type="submit" className="button">Добавить задачу</button>
      </form>

      <div style={{ marginTop: '20px' }}>
        {tasks.map((task) => (
          <div key={task._id} className="card" style={{ marginBottom: '10px' }}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p>Статус: {statusMap[task.status] || task.status}</p>
            <p>Приоритет: {task.priority}</p>
            <p>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;