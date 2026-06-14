import { useAppState } from '../hooks/useAppState';
import { motion } from 'framer-motion';

interface SharedControlsProps {
  showMeanToggle?: boolean;
}

const SharedControls = ({ showMeanToggle = true }: SharedControlsProps) => {
  const { selectedYear, setSelectedYear, showAverage, setShowAverage } = useAppState();

  return (
    <motion.div 
      className="card shared-controls" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '2rem', 
        padding: '1rem 2rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={{ flex: 1, minWidth: '250px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ fontWeight: 600 }}>Selected Year: {selectedYear}</label>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>2015 - 2025</span>
        </div>
        <input 
          type="range" 
          min="2015" 
          max="2025" 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showMeanToggle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <button 
              className={`btn ${showAverage ? '' : 'btn-outline'}`}
              onClick={() => setShowAverage(!showAverage)}
              style={{ 
                background: showAverage ? 'var(--primary)' : 'transparent',
                color: showAverage ? 'white' : 'var(--primary)',
                border: '2px solid var(--primary)',
                padding: '0.5rem 1rem'
              }}
            >
              {showAverage ? '✓ Show Mean Line' : 'Show Mean Line'}
            </button>
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
              Mean of active VPI categories.
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SharedControls;
