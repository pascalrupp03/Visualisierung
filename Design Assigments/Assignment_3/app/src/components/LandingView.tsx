import type { FormEvent } from 'react';
import { useAppState } from '../hooks/useAppState';
import { districtSpread, formatEuro, graduateSalaryBenchmark2023, housingCostRows } from '../data/storyData';

const LandingView = () => {
  const { userData, setUserData, setHasStarted, setCurrentView } = useAppState();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasStarted(true);
    setCurrentView('personal');
  };

  const youngAdultHousing = housingCostRows.find((row) => row.label === '18 bis 34 Jahre');

  return (
    <section className="view-container landing-view">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Vienna affordability gap</p>
          <h1>Young adults are earning more slowly than rents are rising.</h1>
          <p className="hero-text">
            This story aligns income growth, graduate starting salaries, housing costs, and Vienna district rent differences
            so the affordability pressure becomes visible in one connected narrative. The interface starts at the latest
            available year in the dataset, while the source data runs through the latest available years in each table.
          </p>
          <div className="metric-row">
            <div className="metric-card">
              <span>Graduate benchmark 2023</span>
              <strong>{formatEuro(graduateSalaryBenchmark2023?.monthlyGross ?? null, 0)}</strong>
              <small>monthly gross for university-level education</small>
            </div>
            <div className="metric-card">
              <span>Vienna rent spread</span>
              <strong>{formatEuro((districtSpread.highest.avgRentM2 ?? 0) - (districtSpread.lowest.avgRentM2 ?? 0), 2)}</strong>
              <small>per m² between cheapest and most expensive district</small>
            </div>
            <div className="metric-card">
              <span>18-34 housing cost</span>
              <strong>{formatEuro(youngAdultHousing?.mean ?? null, 0)}</strong>
              <small>monthly housing cost estimate from Mikrozensus</small>
            </div>
          </div>
        </div>

        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <h2>Shape the comparison</h2>
            <p>Use your situation as the lens for the charts.</p>
          </div>

          <label className="field-label" htmlFor="age">
            Age
          </label>
          <input
            id="age"
            type="number"
            className="input-field"
            value={userData.age === 0 ? '' : userData.age}
            onChange={(event) => {
              const value = event.target.value;
              setUserData({ ...userData, age: value === '' ? 0 : Number.parseInt(value, 10) });
            }}
            min="16"
            max="100"
            placeholder="25"
          />

          <label className="field-label" htmlFor="salary">
            Monthly gross income
          </label>
          <input
            id="salary"
            type="number"
            className="input-field"
            value={userData.salary === 0 ? '' : userData.salary}
            onChange={(event) => {
              const value = event.target.value;
              setUserData({ ...userData, salary: value === '' ? 0 : Number.parseInt(value, 10) });
            }}
            min="0"
            step="1"
            placeholder="2500"
          />

          <label className="field-label" htmlFor="apartmentSize">
            Apartment size in m²
          </label>
          <input
            id="apartmentSize"
            type="number"
            className="input-field"
            value={userData.apartmentSize === 0 ? '' : userData.apartmentSize}
            onChange={(event) => {
              const value = event.target.value;
              setUserData({ ...userData, apartmentSize: value === '' ? 0 : Number.parseInt(value, 10) });
            }}
            min="1"
            max="500"
            step="1"
            placeholder="40"
          />

          <button type="submit" className="btn btn-primary submit-button">
            Explore the gap
          </button>
          <p className="form-note">
            The next views connect your inputs to income trends, age-group data, and district rent inflation.
          </p>
        </form>
      </div>
    </section>
  );
};

export default LandingView;
