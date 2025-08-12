// utils/validateLocation.ts
import { Country, State } from 'country-state-city';

export const isValidCountry = (country: string): boolean => {
  const countries = Country.getAllCountries();
  return countries.some((c) => c.name.toLowerCase() === country.toLowerCase());
};

export const isValidState = (country: string, state: string): boolean => {
  // First find the country
  const countries = Country.getAllCountries();
  const foundCountry = countries.find((c) => c.name.toLowerCase() === country.toLowerCase());
  
  if (!foundCountry) return false;

  // Get states for this country using its ISO code
  const states = State.getStatesOfCountry(foundCountry.isoCode);
  return states.some((s) => s.name.toLowerCase() === state.toLowerCase());
};