import { useAppState } from '../hooks/useAppState';
import { Home, RotateCcw, User, Map, type LucideIcon } from 'lucide-react';
import type { View } from '../types/data';

const Navigation = () => {
  const { currentView, setCurrentView, hasStarted, resetToStart } = useAppState();

  if (!hasStarted) return null;

  const items = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'personal', label: 'Income', icon: User },
    { id: 'geographic', label: 'Rent Map', icon: Map },
  ] as Array<{ id: View; label: string; icon: LucideIcon }>;

  return (
    <nav className="nav-bar">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`nav-item ${currentView === id ? 'active' : ''}`}
          onClick={() => setCurrentView(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        className="nav-item nav-item-reset"
        onClick={resetToStart}
        aria-label="Back to start"
      >
        <RotateCcw size={18} />
        <span>Reset</span>
      </button>
    </nav>
  );
};

export default Navigation;
