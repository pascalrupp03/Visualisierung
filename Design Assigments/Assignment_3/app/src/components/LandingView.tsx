import { useAppState } from '../hooks/useAppState';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';

const LandingView = () => {
  const { userData, setUserData, setHasStarted, setCurrentView } = useAppState();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasStarted(true);
    setCurrentView('personal');
  };

  return (
    <motion.div 
      className="view-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          Affordable Austria?
        </motion.h1>
        <p>The housing crisis is real. Let's see how it affects YOU.</p>
      </header>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '1.2rem' }}>How old are you?</label>
            <input 
              type="number" 
              style={{ padding: '1rem', fontSize: '1.1rem' }}
              value={userData.age === 0 ? '' : userData.age} 
              onChange={e => {
                const val = e.target.value;
                setUserData({ ...userData, age: val === '' ? 0 : parseInt(val) });
              }}
              min="18"
              max="100"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '1.2rem' }}>Monthly Salary (Gross, EUR)</label>
            <input 
              type="number" 
              style={{ padding: '1rem', fontSize: '1.1rem' }}
              value={userData.salary === 0 ? '' : userData.salary} 
              onChange={e => {
                const val = e.target.value;
                setUserData({ ...userData, salary: val === '' ? 0 : parseInt(val) });
              }}
              min="0"
              max="10000000"
              step="1"
              placeholder="e.g. 2500"
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              Max: 10,000,000 €
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '1.2rem' }}>Apartment Size (m²)</label>
            <input 
              type="number" 
              style={{ padding: '1rem', fontSize: '1.1rem' }}
              value={userData.apartmentSize === 0 ? '' : userData.apartmentSize} 
              onChange={e => {
                const val = e.target.value;
                setUserData({ ...userData, apartmentSize: val === '' ? 0 : parseInt(val) });
              }}
              min="1"
              max="500"
              step="1"
              placeholder="e.g. 40"
            />
          </div>

          <button type="submit" className="btn" style={{ padding: '1.25rem', fontSize: '1.25rem', marginTop: '1rem' }}>
            Analyze My Situation
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default LandingView;
