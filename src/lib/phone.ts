import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export type { CountryCode };

/** The number in international form (+2348012345678), or null when it isn't a valid number. */
export function normalisePhone(raw: string, country?: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), country);
  return parsed && parsed.isValid() ? parsed.number : null;
}

// Dialling codes shared by several places: the main country wins when the number is valid there.
const MAIN: Record<string, CountryCode> = { "1": "US", "7": "RU", "44": "GB", "47": "NO", "61": "AU", "212": "MA", "262": "RE", "358": "FI", "590": "GP", "599": "CW" };

/** Splits a stored international number into its country and the nationally formatted digits. */
export function splitPhone(raw: string): { country: CountryCode; national: string } | null {
  const parsed = parsePhoneNumberFromString(raw.trim());
  if (!parsed) return null;
  const main = MAIN[parsed.countryCallingCode];
  const country = main && isValidPhoneNumber(parsed.number, main) ? main : parsed.country;
  if (!country) return null;
  return { country, national: parsed.formatNational() };
}

/** Formats digits as the visitor types, in that country's usual grouping. */
export function formatAsYouType(raw: string, country: CountryCode) {
  return new AsYouType(country).input(raw);
}

export function dialCode(country: CountryCode) {
  return getCountryCallingCode(country);
}

export function isCountry(code: string | null | undefined): code is CountryCode {
  return Boolean(code) && (getCountries() as string[]).includes(code as string);
}

let cached: { code: CountryCode; name: string; dial: string }[] | null = null;

/** Every country with a dialling code, by name. */
export function countryList() {
  if (cached) return cached;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  cached = getCountries()
    .map((code) => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cached;
}
