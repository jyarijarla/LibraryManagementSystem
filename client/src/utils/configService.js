/**
 * Configuration Service
 * Manages system configuration fetching and caching
 */

// Use local server for development, production for deployed app
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://librarymanagementsystem-be-6s3l.onrender.com';

// Cache for configuration values
const configCache = new Map();
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a configuration value from the API with caching
 * @param {string} key - Configuration key (e.g., 'FINE_RATE_PER_DAY')
 * @param {boolean} forceRefresh - Force refresh from API
 * @returns {Promise<any>} - Configuration value
 */
export async function getConfigValue(key, forceRefresh = false) {
  // Check cache first (unless force refresh)
  if (!forceRefresh && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    if (configCache.has(key)) {
      return configCache.get(key);
    }
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/config/${key}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${key}`);
    }

    const data = await response.json();
    
    // Update cache
    configCache.set(key, data.value);
    cacheTimestamp = Date.now();

    return data.value;
  } catch (error) {
    console.error(`Error fetching config ${key}:`, error);
    // Return default values based on key
    return getDefaultValue(key);
  }
}

/**
 * Get all configuration values
 * @returns {Promise<Array>} - Array of configuration objects
 */
export async function getAllConfig() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/config`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch all configurations');
    }

    const configs = await response.json();
    
    // Update cache with all values
    configs.forEach(config => {
      configCache.set(config.Config_Key, parseConfigValue(config.Config_Value, config.Config_Type));
    });
    cacheTimestamp = Date.now();

    return configs;
  } catch (error) {
    console.error('Error fetching all configurations:', error);
    return [];
  }
}

/**
 * Update a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - New value
 * @param {number} updatedBy - User ID making the update
 * @returns {Promise<Object>} - Update response
 */
export async function updateConfig(key, value, updatedBy) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/config/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value, updatedBy })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update configuration');
    }

    const result = await response.json();
    
    // Invalidate cache
    configCache.clear();
    cacheTimestamp = null;

    return result;
  } catch (error) {
    console.error(`Error updating config ${key}:`, error);
    throw error;
  }
}

/**
 * Get fine rate per day
 * @param {boolean} forceRefresh - Force refresh from API
 * @returns {Promise<number>} - Fine rate in dollars
 */
export async function getFineRate(forceRefresh = false) {
  return await getConfigValue('FINE_RATE_PER_DAY', forceRefresh);
}

/**
 * Calculate fine amount based on days overdue
 * @param {number} daysOverdue - Number of days overdue
 * @param {number} fineRate - Fine rate per day (optional, will fetch if not provided)
 * @returns {Promise<number>} - Fine amount
 */
export async function calculateFine(daysOverdue, fineRate = null) {
  if (daysOverdue <= 0) return 0;
  
  if (fineRate === null) {
    fineRate = await getFineRate();
  }
  
  return daysOverdue * fineRate;
}

/**
 * Clear configuration cache
 */
export function clearConfigCache() {
  configCache.clear();
  cacheTimestamp = null;
}

/**
 * Get default value for a configuration key
 * @param {string} key - Configuration key
 * @returns {any} - Default value
 */
function getDefaultValue(key) {
  const defaults = {
    'FINE_RATE_PER_DAY': 1.00,
    'MAX_BORROW_ITEMS': 5,
    'DEFAULT_BORROW_DAYS': 14,
    'MAX_RENEWAL_COUNT': 2,
    'OVERDUE_NOTIFICATION_DAYS': 3
  };
  return defaults[key] || null;
}

/**
 * Parse configuration value based on type
 * @param {string} value - String value from database
 * @param {string} type - Configuration type
 * @returns {any} - Parsed value
 */
function parseConfigValue(value, type) {
  switch (type) {
    case 'integer':
      return parseInt(value, 10);
    case 'decimal':
    case 'float':
      return parseFloat(value);
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    default:
      return value;
  }
}

export default {
  getConfigValue,
  getAllConfig,
  updateConfig,
  getFineRate,
  calculateFine,
  clearConfigCache
};


