import { useAppState } from '../hooks/useAppState';

interface SharedControlsProps {
  showMeanToggle?: boolean;
  minYear: number;
  maxYear: number;
  note: string;
  value: number;
  onChange: (year: number) => void;
}

const SharedControls = ({ showMeanToggle = true, minYear, maxYear, note, value, onChange }: SharedControlsProps) => {
  const { showAverage, setShowAverage } = useAppState();

  return (
    <div className="card shared-controls">
      <div className="controls-grid">
        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="year-slider">Selected year: {value}</label>
            <span>{minYear} - {maxYear}</span>
          </div>
          <input
            id="year-slider"
            type="range"
            min={minYear}
            max={maxYear}
            value={value}
            onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
          />
          <p className="control-note">{note}</p>
        </div>

        {showMeanToggle && (
          <div className="toggle-group">
            <button
              type="button"
              className={showAverage ? 'btn btn-secondary active' : 'btn btn-secondary'}
              onClick={() => setShowAverage(!showAverage)}
            >
              {showAverage ? 'Mean line on' : 'Show mean line'}
            </button>
            <p className="control-note">Shows or hides the average line.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedControls;
