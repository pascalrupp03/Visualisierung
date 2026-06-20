import type { RentOverlayMode } from '../types/data';

interface SharedControlsProps {
  minYear: number;
  maxYear: number;
  note: string;
  value: number;
  onChange: (year: number) => void;
  rentOverlayMode?: RentOverlayMode;
  onRentOverlayChange?: (mode: RentOverlayMode) => void;
  selectedDistrict?: string | null;
}

const SharedControls = ({
  minYear,
  maxYear,
  note,
  value,
  onChange,
  rentOverlayMode,
  onRentOverlayChange,
  selectedDistrict,
}: SharedControlsProps) => {
  const hasRentToggle = Boolean(rentOverlayMode && onRentOverlayChange);

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

        {hasRentToggle && (
          <div className="toggle-group">
            <div className="segmented-control">
              <button
                type="button"
                className={rentOverlayMode === 'average' ? 'segment active' : 'segment'}
                onClick={() => onRentOverlayChange?.('average')}
              >
                Vienna average
              </button>
              <button
                type="button"
                className={rentOverlayMode === 'selectedDistrict' ? 'segment active' : 'segment'}
                onClick={() => onRentOverlayChange?.('selectedDistrict')}
              >
                {selectedDistrict ?? 'Selected district'}
              </button>
            </div>
            <p className="control-note">Rent overlay source for the income chart.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedControls;
