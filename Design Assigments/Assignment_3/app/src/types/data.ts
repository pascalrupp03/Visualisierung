export type View = 'landing' | 'personal' | 'geographic';

export interface UserData {
  age: number;
  salary: number;
  apartmentSize: number;
}

export interface VpiRecord {
  year: number;
  [category: string]: number;
}

export interface ViennaDistrictRent {
  id: number;
  name: string;
  avg_rent_m2: number;
}

export interface AppData {
  vpi: VpiRecord[];
  vienna_districts: ViennaDistrictRent[];
  cost_distribution: Record<string, number>;
}

export interface DistrictProperties {
  name: string;
}

export type DistrictFeature = GeoJSON.Feature<GeoJSON.Geometry, DistrictProperties>;
export type DistrictFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, DistrictProperties>;