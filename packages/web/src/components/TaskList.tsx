import { Task } from '../api/client';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, onToggleComplete, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        No tasks yet. Add one above!
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {tasks.map((task) => (
        <li
          key={task.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #eee',
            backgroundColor: task.completed ? '#f9f9f9' : 'white',
          }}
        >
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleComplete(task.id)}
            style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
          />
          <span
            style={{
              flex: 1,
              textDecoration: task.completed ? 'line-through' : 'none',
              color: task.completed ? '#999' : '#333',
            }}
          >
            {task.title}
          </span>
          {task.parseWarning && (
            <span
              title="Parse warning - click to review"
              style={{ marginRight: '0.5rem', cursor: 'help' }}
            >
              ⚠️
            </span>
          )}
          <button
            onClick={() => onDelete(task.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              fontSize: '1rem',
            }}
            title="Delete task"
          >
            🗑️
          </button>
        </li>
      ))}
    </ul>
  );
}
