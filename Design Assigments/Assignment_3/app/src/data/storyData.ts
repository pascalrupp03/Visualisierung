import rawData from './data.json';
import type {
  StoryData,
  ViennaDistrictRent,
} from '../types/data';

const storyData = rawData as unknown as StoryData;

const housingIndex = storyData.housing.inflation.annualHousingIndex;
const firstHousingIndex = housingIndex[0]?.index ?? 100;
const latestHousingIndex = housingIndex[housingIndex.length - 1]?.index ?? 100;
const latestIncomeYear = storyData.income.trend.gross[storyData.income.trend.gross.length - 1]?.year ?? 2023;

export const data = storyData;
export const districtRents = storyData.housing.districts;
export const incomeTrend = storyData.income.trend.gross;
export const realIncomeTrend = storyData.income.trend.realGross;
export const netIncomeTrend = storyData.income.trend.net;
export const realNetIncomeTrend = storyData.income.trend.realNet;
export const ageIncomeRows = storyData.income.ageGroups2023;
export const educationIncomeRows = storyData.income.education2023;
export const occupationIncomeRows = storyData.income.occupation2023;

export const graduateSalaryBenchmark2023 = storyData.income.graduateBenchmark2023;
export const youngAdultBenchmark2023 = storyData.income.youngAdultBenchmark2023;

export const districtSpread = storyData.housing.districtSpread;
export const housingCostRows = storyData.housing.costsByAge2024;
export const tenureRows = storyData.housing.tenureByAge2024;
export const contractDurationRows = storyData.housing.contractDuration2024;

export const housingInflationAnnual = storyData.housing.inflation.annualHousingIndex;
export const housingInflationSnapshots = storyData.housing.inflation.annualCategorySnapshots;

export const viennaAverageRentPerM2 = districtRents.reduce(
  (sum, district) => sum + (district.avgRentM2 ?? 0),
  0,
) / districtRents.length;

export function getReferenceIncomeYear(year: number) {
  return Math.min(year, latestIncomeYear);
}

export function getIncomePoint(year: number) {
  return incomeTrend.find((point) => point.year === year) ?? incomeTrend[incomeTrend.length - 1];
}

export function getRealIncomePoint(year: number) {
  return realIncomeTrend.find((point) => point.year === year) ?? realIncomeTrend[realIncomeTrend.length - 1];
}

export function getAgeIncomeRow(label: string) {
  return ageIncomeRows.find((row) => row.label === label) ?? null;
}

export function getEducationIncomeRow(label: string) {
  return educationIncomeRows.find((row) => row.label === label) ?? null;
}

export function getOccupationIncomeRow(label: string) {
  return occupationIncomeRows.find((row) => row.label === label) ?? null;
}

export function getHousingIndexForYear(year: number) {
  const point = housingInflationAnnual.find((entry) => entry.year === year);
  if (point) return point.index ?? latestHousingIndex;
  if (year < housingInflationAnnual[0]?.year) return firstHousingIndex;
  if (year > housingInflationAnnual[housingInflationAnnual.length - 1]?.year) return latestHousingIndex;
  const nearestYear = housingInflationAnnual.reduce((closest, entry) => {
    if (!closest) return entry;
    return Math.abs(entry.year - year) < Math.abs(closest.year - year) ? entry : closest;
  }, housingInflationAnnual[0]);
  return nearestYear?.index ?? latestHousingIndex;
}

export function getHousingIndexRatio(year: number) {
  const index = getHousingIndexForYear(year);
  return index / latestHousingIndex;
}

export function getDistrictRentForYear(district: ViennaDistrictRent, year: number) {
  const ratio = getHousingIndexRatio(year);
  return (district.avgRentM2 ?? 0) * ratio;
}

export function getDistrictRentSeries(apartmentSize: number, district?: ViennaDistrictRent) {
  const chosenDistrict = district ?? districtRents[0];

  return housingInflationAnnual.map((entry) => ({
    year: entry.year,
    rentPerM2: getDistrictRentForYear(chosenDistrict, entry.year),
    monthlyRent: getDistrictRentForYear(chosenDistrict, entry.year) * apartmentSize,
  }));
}

export function getAverageDistrictRentSeries(apartmentSize: number) {
  return housingInflationAnnual.map((entry) => ({
    year: entry.year,
    rentPerM2: districtSpread.average * (entry.index ?? latestHousingIndex) / latestHousingIndex,
    monthlyRent: districtSpread.average * apartmentSize * (entry.index ?? latestHousingIndex) / latestHousingIndex,
  }));
}

export function getAffordabilityShare(monthlyCost: number, monthlyIncome: number) {
  if (!monthlyIncome) return 0;
  return (monthlyCost / monthlyIncome) * 100;
}

export function getSelectedIncomeContext(year: number) {
  const point = getIncomePoint(getReferenceIncomeYear(year));
  const benchmark = graduateSalaryBenchmark2023;
  const youngAdult = youngAdultBenchmark2023;

  return {
    year: point.year,
    monthlyGross: (point.overall ?? 0) / 12,
    realMonthlyGross: (getRealIncomePoint(point.year).overall ?? 0) / 12,
    graduateMonthlyGross: benchmark?.monthlyGross ?? 0,
    youngAdultMonthlyGross: youngAdult?.monthlyGross ?? 0,
  };
}

export function formatEuro(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return `€${value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return `${value.toFixed(digits)}%`;
}

export type ComparisonMode = 'age' | 'education' | 'occupation';

export interface ComparisonDatasetRow {
  label: string;
  value: number;
  secondaryValue?: number;
  tertiaryValue?: number;
  meta?: string;
}

export function getComparisonDataset(mode: ComparisonMode): ComparisonDatasetRow[] {
  if (mode === 'age') {
    return ageIncomeRows.map((row) => ({
      label: row.label,
      value: row.income.all.median ?? 0,
      secondaryValue: row.income.fullTime.median ?? 0,
      meta: `women vs men ${formatPercent(row.femaleMedianShareAll, 1)}`,
    }));
  }

  if (mode === 'education') {
    return educationIncomeRows.map((row) => ({
      label: row.label,
      value: row.income.all.median ?? 0,
      secondaryValue: row.income.all.female ?? 0,
      tertiaryValue: row.income.all.male ?? 0,
      meta: `women vs men ${formatPercent(row.femaleMedianShare, 1)}`,
    }));
  }

  return occupationIncomeRows.map((row) => ({
    label: row.label,
    value: row.income.median ?? 0,
    secondaryValue: row.income.q1 ?? 0,
    tertiaryValue: row.income.q3 ?? 0,
    meta: `IQR ${formatEuro(row.iqr, 0)}`,
  }));
}
