import { useEffect, useState, useCallback } from 'react';
import { api, Task } from './api/client';
import { TaskList } from './components/TaskList';
import { AddTaskForm } from './components/AddTaskForm';
import { ErrorMessage } from './components/ErrorMessage';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const { tasks } = await api.getTasks();
      setTasks(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async (title: string) => {
    try {
      setError(null);
      const { task } = await api.createTask({ title });
      setTasks((prev) => [task, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      setError(null);
      const { task } = await api.toggleComplete(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          padding: '1.5rem 1rem',
          borderBottom: '1px solid #eee',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>LifeTracker</h1>
        <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.9rem' }}>
          {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''} remaining
        </p>
      </header>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <AddTaskForm onAdd={handleAddTask} disabled={loading} />

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      ) : (
        <>
          <TaskList
            tasks={incompleteTasks}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
          />

          {completedTasks.length > 0 && (
            <>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                Completed ({completedTasks.length})
              </div>
              <TaskList
                tasks={completedTasks}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
