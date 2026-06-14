import { useAppState } from '../hooks/useAppState';
import { Home, User, Map, type LucideIcon } from 'lucide-react';
import type { View } from '../types/data';

const Navigation = () => {
  const { currentView, setCurrentView, hasStarted } = useAppState();

  if (!hasStarted) return null;

  const items = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'geographic', label: 'Map', icon: Map },
  ] as Array<{ id: View; label: string; icon: LucideIcon }>;

  return (
    <nav className="nav-bar">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${currentView === id ? 'active' : ''}`}
          onClick={() => setCurrentView(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
