export type View = 'landing' | 'personal' | 'geographic';

export interface UserData {
  age: number;
  salary: number;
  apartmentSize: number;
}

export interface IncomePoint {
  year: number;
  overall: number | null;
  women: number | null;
  men: number | null;
}

export interface IncomeDistribution {
  q1: number | null;
  median: number | null;
  q3: number | null;
}

export interface IncomeMedianSet {
  median: number | null;
  female: number | null;
  male: number | null;
}

export interface EducationIncomeRow {
  label: string;
  population: number | null;
  femaleShare: number | null;
  income: {
    all: {
      median: number | null;
      female: number | null;
      male: number | null;
    };
  };
  femaleMedianShare: number | null;
}

export interface AgeIncomeRow {
  label: string;
  income: {
    all: IncomeMedianSet;
    fullTime: IncomeMedianSet;
  };
  femaleMedianShareAll: number | null;
  femaleMedianShareFullTime: number | null;
}

export interface OccupationIncomeRow {
  code: string;
  label: string;
  femaleShare: number | null;
  income: IncomeDistribution;
  iqr: number | null;
  iqrToMedian: number | null;
}

export interface HousingCostRow {
  label: string;
  population: number | null;
  quantiles: {
    p10: number | null;
    p25: number | null;
    median: number | null;
    p75: number | null;
    p90: number | null;
  };
  mean: number | null;
}

export interface TenureRow {
  label: string;
  population: number | null;
  shares: {
    homeOwnership: number | null;
    apartmentOwnership: number | null;
    municipal: number | null;
    cooperative: number | null;
    privateRent: number | null;
    other: number | null;
  };
}

export interface ContractDurationRow {
  label: string;
  population: number | null;
  durationShares: {
    under2: number | null;
    "2to5": number | null;
    "5to10": number | null;
    "10to20": number | null;
    "20to30": number | null;
    "30plus": number | null;
  };
  durationStats: {
    mean: number | null;
    median: number | null;
  };
  fixedTermShare: number | null;
}

export interface ViennaDistrictRent {
  id: number;
  name: string;
  avgRentM2: number | null;
}

export interface StoryData {
  meta: {
    generatedAt: string;
    sourceFiles: Record<string, string>;
  };
  income: {
    trend: {
      gross: IncomePoint[];
      net: IncomePoint[];
      realGross: IncomePoint[];
      realNet: IncomePoint[];
    };
    ageGroups2023: AgeIncomeRow[];
    education2023: EducationIncomeRow[];
    occupation2023: OccupationIncomeRow[];
    graduateBenchmark2023: {
      label: string;
      annualGross: number;
      monthlyGross: number;
      fullTimeAnnualGross: number;
      fullTimeMonthlyGross: number;
    } | null;
    youngAdultBenchmark2023: {
      label: string;
      annualGross: number;
      monthlyGross: number;
      fullTimeAnnualGross: number;
      fullTimeMonthlyGross: number;
    } | null;
  };
  housing: {
    costsByAge2024: HousingCostRow[];
    tenureByAge2024: TenureRow[];
    contractDuration2024: ContractDurationRow[];
    districts: ViennaDistrictRent[];
    districtSpread: {
      average: number;
      lowest: ViennaDistrictRent;
      highest: ViennaDistrictRent;
      topThree: ViennaDistrictRent[];
      bottomThree: ViennaDistrictRent[];
    };
    inflation: {
      monthly: Array<Record<string, unknown>>;
      annual: Array<Record<string, unknown>>;
      annualHousingIndex: Array<{ year: number; index: number | null }>;
      annualCategorySnapshots: Array<{
        year: number;
        housing: number | null;
        food: number | null;
        transport: number | null;
        communication: number | null;
        gastronomy: number | null;
      }>;
    };
  };
}

export interface DistrictProperties {
  name: string;
}

export type DistrictFeature = GeoJSON.Feature<GeoJSON.Geometry, DistrictProperties>;
export type DistrictFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, DistrictProperties>;

export type RentOverlayMode = 'average' | 'selectedDistrict';

export interface AffordabilityStatus {
  affordable: boolean;
  rentPercentage: number;
}
