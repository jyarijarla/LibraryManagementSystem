const db = require('../db');

// Cache for configuration values to reduce database queries
let configCache = new Map();
let cacheLastUpdated = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/** 
 * Get configuration value from database with caching
 * @param {string} key - Configuration key
 * @returns {Promise<any>} - Configuration value
 */
const getConfigValue = async (key) => {
  // Check if cache is still valid
  if (cacheLastUpdated && (Date.now() - cacheLastUpdated < CACHE_DURATION)) {
    if (configCache.has(key)) {
      return configCache.get(key);
    }
  }

  // Fetch from database
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT Config_Value, Config_Type FROM system_config WHERE Config_Key = ?',
      [key],
      (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        if (results.length === 0) {
          reject(new Error(`Configuration key '${key}' not found`));
          return;
        }

        const { Config_Value, Config_Type } = results[0];
        let value = Config_Value;

        // Parse value based on type
        switch (Config_Type) {
          case 'integer':
            value = parseInt(Config_Value, 10);
            break;
          case 'decimal':
          case 'float':
            value = parseFloat(Config_Value);
            break;
          case 'boolean':
            value = Config_Value.toLowerCase() === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(Config_Value);
            } catch (e) {
              console.error('Error parsing JSON config:', e);
            }
            break;
          // 'string' and default case use the value as-is
        }

        // Update cache
        configCache.set(key, value);
        cacheLastUpdated = Date.now();

        resolve(value);
      }
    );
  });
};

/**
 * Invalidate the configuration cache
 */
const invalidateCache = () => {
  configCache.clear();
  cacheLastUpdated = null;
};

/**
 * Get all configuration settings
 * GET /api/config
 */
exports.getAllConfig = (req, res) => {
  const query = `
    SELECT 
      Config_ID,
      Config_Key,
      Config_Value,
      Config_Type,
      Config_Description AS Description,
      Last_Updated,
      Updated_By
    FROM system_config
    ORDER BY Config_Key
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching configuration:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch configuration', error: err.message }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

/**
 * Get specific configuration value
 * GET /api/config/:key
 */
exports.getConfig = async (req, res) => {
  const { key } = req.params;

  try {
    const value = await getConfigValue(key);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ key, value }));
  } catch (error) {
    console.error('Error fetching config value:', error);
    return res.writeHead(404, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: error.message }));
  }
};

/**
 * Update configuration value
 * PUT /api/config/:key
 * Body: { value, updatedBy }
 */
exports.updateConfig = (req, res) => {
  const { key } = req.params;
  const { value, updatedBy } = req.body;

  if (value === undefined || value === null) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Value is required' }));
  }

  // Update configuration
  db.query(
    'UPDATE system_config SET Config_Value = ?, Updated_By = ?, Last_Updated = CURRENT_TIMESTAMP WHERE Config_Key = ?',
    [String(value), updatedBy || null, key],
    (err, result) => {
      if (err) {
        console.error('Error updating configuration:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to update configuration', error: err.message }));
      }

      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Configuration key not found' }));
      }

      // Invalidate cache
      invalidateCache();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Configuration updated successfully',
        key,
        value
      }));
    }
  );
};

/**
 * Create new configuration
 * POST /api/config
 * Body: { key, value, type, description, updatedBy }
 */
exports.createConfig = (req, res) => {
  const { key, value, type = 'string', description, updatedBy } = req.body;

  if (!key || value === undefined) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Key and value are required' }));
  }

  const validTypes = ['string', 'integer', 'decimal', 'float', 'boolean', 'json'];
  if (!validTypes.includes(type)) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ 
        message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
      }));
  }

  db.query(
    'INSERT INTO system_config (Config_Key, Config_Value, Config_Type, Config_Description, Updated_By) VALUES (?, ?, ?, ?, ?)',
    [key, String(value), type, description || null, updatedBy || null],
    (err, result) => {
      if (err) {
        console.error('Error creating configuration:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.writeHead(400, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Configuration key already exists' }));
        }
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to create configuration', error: err.message }));
      }

      // Invalidate cache
      invalidateCache();

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Configuration created successfully',
        configId: result.insertId
      }));
    }
  );
};

/**
 * Delete configuration
 * DELETE /api/config/:key
 */
exports.deleteConfig = (req, res) => {
  const { key } = req.params;

  // Prevent deletion of critical system configs
  const protectedKeys = [
    'FINE_RATE_PER_DAY',
    'MAX_BORROW_ITEMS',
    'DEFAULT_BORROW_DAYS'
  ];

  if (protectedKeys.includes(key)) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ 
        message: 'Cannot delete protected system configuration'
      }));
  }

  db.query(
    'DELETE FROM system_config WHERE Config_Key = ?',
    [key],
    (err, result) => {
      if (err) {
        console.error('Error deleting configuration:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to delete configuration' }));
      }

      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Configuration key not found' }));
      }

      // Invalidate cache
      invalidateCache();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Configuration deleted successfully' }));
    }
  );
};

// Export helper function for use in other controllers
exports.getConfigValue = getConfigValue;
exports.invalidateCache = invalidateCache;

module.exports = exports;


