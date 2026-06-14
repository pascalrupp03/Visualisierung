import { AppProvider, useAppState } from './hooks/useAppState';
import LandingView from './components/LandingView';
import PersonalOverviewView from './components/PersonalOverviewView';
import GeographicView from './components/GeographicView';
import Navigation from './components/Navigation';
import { AnimatePresence } from 'framer-motion';
import './styles/globals.css';

const AppContent = () => {
  const { currentView } = useAppState();

  const renderView = () => {
    switch (currentView) {
      case 'landing': return <LandingView key="landing" />;
      case 'personal': return <PersonalOverviewView key="personal" />;
      case 'geographic': return <GeographicView key="geographic" />;
      default: return <LandingView key="landing" />;
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <AnimatePresence mode="wait">
          {renderView()}
        </AnimatePresence>
      </main>
      <Navigation />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
