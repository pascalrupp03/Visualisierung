import type { AffordabilityStatus } from '../types/data';

const AFFORDABILITY_THRESHOLD = 30;

export function useAffordabilityCalculator(monthlyRent: number, monthlyIncome: number): AffordabilityStatus {
  if (!monthlyIncome || monthlyIncome <= 0) {
    return {
      affordable: false,
      rentPercentage: 0,
    };
  }

  const rentPercentage = (monthlyRent / monthlyIncome) * 100;
  return {
    affordable: rentPercentage <= AFFORDABILITY_THRESHOLD,
    rentPercentage,
  };
}
