/**
 * Input Validation and Sanitization Utilities
 * 
 * Prevents:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Command Injection
 * - Path Traversal
 * - NoSQL Injection
 * - LDAP Injection
 */

const crypto = require('crypto');

/**
 * Sanitize string input - remove dangerous characters
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized input
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Remove control characters except newlines and tabs if specified
  if (options.allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  // Escape HTML entities to prevent XSS
  if (options.escapeHTML !== false) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Maximum length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {Object} - { valid: boolean, sanitized: string, error: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email is required' };
  }

  // Sanitize
  const sanitized = email.trim().toLowerCase();

  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized, error: 'Invalid email format' };
  }

  // Check length
  if (sanitized.length > 254) {
    return { valid: false, sanitized, error: 'Email too long' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /on\w+\s*=/i,
    /\.\./,
    /%00/,
    /\\x/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return { valid: false, sanitized, error: 'Email contains invalid characters' };
    }
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validate and sanitize username
 * @param {string} username - Username to validate
 * @returns {Object} - { valid: boolean, sanitized: string, error: string }
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, sanitized: '', error: 'Username is required' };
  }

  const sanitized = username.trim();

  // Username rules: 3-30 characters, alphanumeric plus underscore and dash
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;

  if (!usernameRegex.test(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: 'Username must be 3-30 characters and contain only letters, numbers, underscore, or dash'
    };
  }

  // Cannot start or end with special characters
  if (/^[_-]|[_-]$/.test(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: 'Username cannot start or end with underscore or dash'
    };
  }

  // Check for reserved words
  const reservedWords = [
    'admin', 'administrator', 'root', 'system', 'api', 'null', 'undefined',
    'delete', 'drop', 'select', 'insert', 'update', 'exec', 'script'
  ];

  if (reservedWords.includes(sanitized.toLowerCase())) {
    return { valid: false, sanitized, error: 'Username is reserved' };
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, score: number, error: string, suggestions: array }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      score: 0,
      error: 'Password is required',
      suggestions: []
    };
  }

  const suggestions = [];
  let score = 0;

  // Minimum length
  if (password.length < 8) {
    return {
      valid: false,
      score: 0,
      error: 'Password must be at least 8 characters long',
      suggestions: ['Use at least 8 characters']
    };
  }

  // Check for common patterns
  const commonPatterns = [
    /^123456/,
    /password/i,
    /qwerty/i,
    /^abc/i,
    /admin/i,
    /letmein/i,
    /welcome/i
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      return {
        valid: false,
        score: 1,
        error: 'Password is too common',
        suggestions: ['Avoid common passwords']
      };
    }
  }

  // Check complexity
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasLowercase) score++;
  if (hasUppercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Provide suggestions
  if (!hasLowercase) suggestions.push('Add lowercase letters');
  if (!hasUppercase) suggestions.push('Add uppercase letters');
  if (!hasNumber) suggestions.push('Add numbers');
  if (!hasSpecial) suggestions.push('Add special characters');
  if (password.length < 12) suggestions.push('Use at least 12 characters for better security');

  // Valid if has at least 3 types and 8+ characters
  const valid = score >= 3 && password.length >= 8;

  return {
    valid,
    score,
    error: valid ? null : 'Password is too weak',
    suggestions
  };
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {Object} - { valid: boolean, sanitized: string, error: string }
 */
function validatePhone(phone) {
  if (!phone) {
    return { valid: true, sanitized: null, error: null }; // Phone is optional
  }

  if (typeof phone !== 'string') {
    return { valid: false, sanitized: '', error: 'Invalid phone number' };
  }

  // Remove common separators
  const sanitized = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's all digits (with optional + prefix)
  const phoneRegex = /^\+?\d{10,15}$/;

  if (!phoneRegex.test(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: 'Phone number must be 10-15 digits'
    };
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validate integer
 * @param {any} value - Value to validate
 * @param {Object} options - { min, max }
 * @returns {Object} - { valid: boolean, value: number, error: string }
 */
function validateInteger(value, options = {}) {
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return { valid: false, value: null, error: 'Must be a valid integer' };
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, value: num, error: `Must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { valid: false, value: num, error: `Must be at most ${options.max}` };
  }

  return { valid: true, value: num, error: null };
}

/**
 * Validate decimal/float
 * @param {any} value - Value to validate
 * @param {Object} options - { min, max, decimals }
 * @returns {Object} - { valid: boolean, value: number, error: string }
 */
function validateDecimal(value, options = {}) {
  const num = parseFloat(value);

  if (isNaN(num)) {
    return { valid: false, value: null, error: 'Must be a valid number' };
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, value: num, error: `Must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { valid: false, value: num, error: `Must be at most ${options.max}` };
  }

  // Round to specified decimal places
  if (options.decimals !== undefined) {
    const multiplier = Math.pow(10, options.decimals);
    const rounded = Math.round(num * multiplier) / multiplier;
    return { valid: true, value: rounded, error: null };
  }

  return { valid: true, value: num, error: null };
}

/**
 * Validate date
 * @param {string} date - Date string to validate (YYYY-MM-DD)
 * @returns {Object} - { valid: boolean, value: Date, error: string }
 */
function validateDate(date) {
  if (!date) {
    return { valid: false, value: null, error: 'Date is required' };
  }

  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, value: null, error: 'Date must be in YYYY-MM-DD format' };
  }

  const parsedDate = new Date(date);
  
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, value: null, error: 'Invalid date' };
  }

  // Check if date is reasonable (not too far in past/future)
  const year = parsedDate.getFullYear();
  if (year < 1900 || year > 2100) {
    return { valid: false, value: parsedDate, error: 'Date out of reasonable range' };
  }

  return { valid: true, value: parsedDate, error: null };
}

/**
 * Sanitize SQL input (escape special characters)
 * NOTE: Still use parameterized queries! This is additional protection.
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeSQL(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .replace(/xp_/gi, '') // Remove extended stored procedures
    .replace(/sp_/gi, '') // Remove stored procedures
    .replace(/exec/gi, '') // Remove exec
    .replace(/execute/gi, '') // Remove execute
    .replace(/drop/gi, '') // Remove drop
    .replace(/truncate/gi, ''); // Remove truncate
}

/**
 * Validate file path (prevent path traversal)
 * @param {string} path - File path to validate
 * @returns {Object} - { valid: boolean, sanitized: string, error: string }
 */
function validateFilePath(path) {
  if (!path || typeof path !== 'string') {
    return { valid: false, sanitized: '', error: 'Path is required' };
  }

  // Check for path traversal attempts
  const dangerousPatterns = [
    /\.\./,  // Parent directory
    /^\//, // Absolute path
    /^\\/, // Windows absolute path
    /^[a-zA-Z]:/, // Windows drive letter
    /~/, // Home directory
    /%00/, // Null byte
    /\x00/ // Null byte
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(path)) {
      return { valid: false, sanitized: '', error: 'Invalid file path detected' };
    }
  }

  // Sanitize
  const sanitized = path.replace(/[^\w\s\-\.\/]/g, '');

  return { valid: true, sanitized, error: null };
}

/**
 * Validate JSON input
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} - { valid: boolean, value: object, error: string }
 */
function validateJSON(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, value: null, error: 'Invalid JSON input' };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, value: parsed, error: null };
  } catch (error) {
    return { valid: false, value: null, error: 'Invalid JSON format' };
  }
}

/**
 * Validate array of allowed values
 * @param {any} value - Value to validate
 * @param {array} allowedValues - Array of allowed values
 * @returns {Object} - { valid: boolean, value: any, error: string }
 */
function validateEnum(value, allowedValues) {
  if (!Array.isArray(allowedValues)) {
    throw new Error('allowedValues must be an array');
  }

  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      value,
      error: `Value must be one of: ${allowedValues.join(', ')}`
    };
  }

  return { valid: true, value, error: null };
}

/**
 * Comprehensive validation middleware
 * @param {Object} rules - Validation rules object
 * @returns {Function} - Express middleware
 */
function validate(rules) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      switch (rule.type) {
        case 'email':
          const emailResult = validateEmail(value);
          if (!emailResult.valid) {
            errors.push({ field, message: emailResult.error });
          } else {
            req.body[field] = emailResult.sanitized;
          }
          break;

        case 'username':
          const usernameResult = validateUsername(value);
          if (!usernameResult.valid) {
            errors.push({ field, message: usernameResult.error });
          } else {
            req.body[field] = usernameResult.sanitized;
          }
          break;

        case 'password':
          const passwordResult = validatePassword(value);
          if (!passwordResult.valid) {
            errors.push({ field, message: passwordResult.error, suggestions: passwordResult.suggestions });
          }
          break;

        case 'phone':
          const phoneResult = validatePhone(value);
          if (!phoneResult.valid) {
            errors.push({ field, message: phoneResult.error });
          } else {
            req.body[field] = phoneResult.sanitized;
          }
          break;

        case 'integer':
          const intResult = validateInteger(value, rule.options);
          if (!intResult.valid) {
            errors.push({ field, message: intResult.error });
          } else {
            req.body[field] = intResult.value;
          }
          break;

        case 'decimal':
          const decimalResult = validateDecimal(value, rule.options);
          if (!decimalResult.valid) {
            errors.push({ field, message: decimalResult.error });
          } else {
            req.body[field] = decimalResult.value;
          }
          break;

        case 'date':
          const dateResult = validateDate(value);
          if (!dateResult.valid) {
            errors.push({ field, message: dateResult.error });
          } else {
            req.body[field] = dateResult.value;
          }
          break;

        case 'string':
          req.body[field] = sanitizeString(value, rule.options || {});
          break;

        case 'enum':
          const enumResult = validateEnum(value, rule.allowedValues);
          if (!enumResult.valid) {
            errors.push({ field, message: enumResult.error });
          }
          break;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
}

module.exports = {
  sanitizeString,
  validateEmail,
  validateUsername,
  validatePassword,
  validatePhone,
  validateInteger,
  validateDecimal,
  validateDate,
  sanitizeSQL,
  validateFilePath,
  validateJSON,
  validateEnum,
  validate
};


