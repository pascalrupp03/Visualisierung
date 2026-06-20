import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState, type FormEvent } from 'react';
import { useAppState } from '../hooks/useAppState';
import { formatEuro, housingInflationAnnual, incomeTrend } from '../data/storyData';

interface FormErrors {
  age?: string;
  salary?: string;
  apartmentSize?: string;
}

const LandingView = () => {
  const { userData, setUserData, setHasStarted, setCurrentView } = useAppState();
  const [step, setStep] = useState<'intro' | 'form'>('intro');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formValues, setFormValues] = useState({
    age: String(userData.age),
    salary: String(userData.salary),
    apartmentSize: String(userData.apartmentSize),
  });

  const introStats = useMemo(() => {
    const income1998 = incomeTrend.find((point) => point.year === 1998)?.overall ?? 0;
    const incomeLatest = incomeTrend[incomeTrend.length - 1]?.overall ?? 0;
    const incomeGrowth = income1998 > 0 ? ((incomeLatest - income1998) / income1998) * 100 : 0;

    const firstHousingYear = housingInflationAnnual[0]?.year ?? 2005;
    const rent2005 = housingInflationAnnual.find((point) => point.year === firstHousingYear)?.index ?? 0;
    const rentLatest = housingInflationAnnual[housingInflationAnnual.length - 1]?.index ?? 0;
    const rentGrowth = rent2005 > 0 ? ((rentLatest - rent2005) / rent2005) * 100 : 0;

    return {
      incomeGrowth,
      rentGrowth,
    };
  }, []);

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    const age = Number.parseInt(formValues.age, 10);
    const salary = Number.parseInt(formValues.salary, 10);
    const apartmentSize = Number.parseInt(formValues.apartmentSize, 10);

    if (!Number.isFinite(age) || age < 16 || age > 100) {
      nextErrors.age = 'Please enter an age between 16 and 100.';
    }

    if (!Number.isFinite(salary) || salary < 700 || salary > 20000) {
      nextErrors.salary = 'Please enter a monthly gross income between 700 and 20,000.';
    }

    if (!Number.isFinite(apartmentSize) || apartmentSize < 15 || apartmentSize > 150) {
      nextErrors.apartmentSize = 'Please enter an apartment size between 15 and 150 m².';
    }

    setFormErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, age, salary, apartmentSize };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { isValid, age, salary, apartmentSize } = validateForm();
    if (!isValid) return;

    setUserData({ age, salary, apartmentSize });
    setHasStarted(true);
    setCurrentView('personal');
  };

  return (
    <section className="view-container landing-view">
      <div className="hero-panel landing-panel">
        <AnimatePresence mode="wait">
          {step === 'intro' ? (
            <motion.div
              key="intro"
              className="hero-copy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <p className="eyebrow">Vienna affordability gap</p>
              <h1>Income and rent are drifting apart.</h1>
              <p className="hero-text">Two quick facts before we start:</p>

              <div className="metric-row landing-metrics">
                <motion.div className="metric-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <span>Income growth since 1998</span>
                  <strong>+{introStats.incomeGrowth.toFixed(0)}%</strong>
                  <small>annual gross income (dataset trend)</small>
                </motion.div>
                <motion.div className="metric-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <span>Housing inflation since 2005</span>
                  <strong>+{introStats.rentGrowth.toFixed(0)}%</strong>
                  <small>housing index (Vienna timeline)</small>
                </motion.div>
              </div>

              <button type="button" className="btn btn-primary" onClick={() => setStep('form')}>
                Continue
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              className="form-panel"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <div className="panel-header">
                <h2>Start with your numbers</h2>
                <p>We use these values for the comparison in the next views.</p>
              </div>

              <label className="field-label" htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                className={`input-field ${formErrors.age ? 'input-error' : ''}`}
                value={formValues.age}
                onChange={(event) => setFormValues((prev) => ({ ...prev, age: event.target.value }))}
                min="16"
                max="100"
                step="1"
                placeholder="25"
              />
              {formErrors.age && <p className="input-help error">{formErrors.age}</p>}

              <label className="field-label" htmlFor="salary">Monthly gross income (€)</label>
              <input
                id="salary"
                type="number"
                className={`input-field ${formErrors.salary ? 'input-error' : ''}`}
                value={formValues.salary}
                onChange={(event) => setFormValues((prev) => ({ ...prev, salary: event.target.value }))}
                min="700"
                max="20000"
                step="50"
                placeholder="2500"
              />
              {formErrors.salary && <p className="input-help error">{formErrors.salary}</p>}

              <label className="field-label" htmlFor="apartmentSize">Apartment size (m²)</label>
              <input
                id="apartmentSize"
                type="number"
                className={`input-field ${formErrors.apartmentSize ? 'input-error' : ''}`}
                value={formValues.apartmentSize}
                onChange={(event) => setFormValues((prev) => ({ ...prev, apartmentSize: event.target.value }))}
                min="15"
                max="150"
                step="1"
                placeholder="40"
              />
              <p className="input-help">Typical range: 20-80 m².</p>
              {formErrors.apartmentSize && <p className="input-help error">{formErrors.apartmentSize}</p>}

              <div className="landing-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStep('intro')}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Open dashboard
                </button>
              </div>

              <p className="form-note">Reference example: {formatEuro(Number.parseInt(formValues.salary || '0', 10) || null, 0)} gross per month.</p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default LandingView;
