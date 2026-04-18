import { supabase } from './supabase';

/**
 * Formats a number as currency
 * @param {number|string} amount - The value to format
 * @param {string} currency - The currency code (gs, usd, brl, ars)
 * @returns {string} The formatted value
 */
export function formatCurrency(amount, currency = 'gs') {
  const numericAmount = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
  
  // Map internal currency codes to ISO codes or symbols
  const currencyMap = {
    'gs': 'PYG',
    'usd': 'USD',
    'brl': 'BRL',
    'ars': 'ARS'
  };

  const isoCurrency = currencyMap[currency] || 'PYG';

  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: isoCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 // Usually GS doesn't use decimals, adjust if needed for others
  }).format(numericAmount);
}

/**
 * Parses a currency string to number, supporting both integers and decimals
 * @param {string|number} value - The value to parse
 * @returns {number} The numeric value
 */
export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const stringValue = String(value);
  const isNegative = stringValue.includes('-');
  
  // Remove thousand separators (dots in es-PY) and replace decimal comma with dot
  const cleanValue = stringValue
    .replace(/\./g, '') 
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  
  const number = parseFloat(cleanValue) || 0;
  
  return isNegative ? -number : number;
}

/**
 * Formats a number for input display with thousand separators (no symbols)
 * @param {number|string} value - The value to format
 * @param {boolean} allowDecimals - Whether to keep decimals (for foreign currency)
 * @returns {string} The formatted value
 */
export function formatInputNumber(value, allowDecimals = false) {
  if (value === '' || value === null || value === undefined) return '';
  
  let numericValue = typeof value === 'number' ? value : parseCurrency(value);
  
  if (isNaN(numericValue)) return '';

  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: allowDecimals ? 2 : 0
  }).format(numericValue);
}


/**
 * Helper to get user session safely
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return data.session;
}

/**
 * Helper to get current user profile
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('perfiles_usuarios')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
  return data;
}
