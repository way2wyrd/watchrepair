// Supported currency formats for user preferences.
// `locale` drives symbol placement and grouping/decimal separators.
export const CURRENCIES = [
  { code: 'USD', locale: 'en-US', label: 'US Dollar ($)' },
  { code: 'EUR', locale: 'de-DE', label: 'Euro (€)' },
  { code: 'GBP', locale: 'en-GB', label: 'British Pound (£)' },
  { code: 'CHF', locale: 'de-CH', label: 'Swiss Franc (CHF)' },
  { code: 'JPY', locale: 'ja-JP', label: 'Japanese Yen (¥)' },
  { code: 'CAD', locale: 'en-CA', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', locale: 'en-AU', label: 'Australian Dollar (A$)' },
];

export const DEFAULT_CURRENCY = 'USD';

// Format a numeric amount according to the given currency code.
// Falls back to USD for unknown/missing codes.
export function formatCurrency(amount, currencyCode = DEFAULT_CURRENCY) {
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}
