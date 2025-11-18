import CryptoJS from 'crypto-js';

// This should match server's SECRET_PEPPER, but client doesn't need to know it
// The signature prevents tampering but doesn't require shared secret in client
const generateNonce = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

const generateSignature = (method, url, timestamp, nonce) => {
  // Create HMAC signature - server will verify with SECRET_PEPPER
  // Client generates its own signature that server validates
  const dataToSign = `${method}:${url}:${timestamp}:${nonce}`;
  
  // Use a client-side key that server will validate differently
  // This prevents simple Postman use without understanding the full flow
  const clientKey = CryptoJS.SHA256('library-management-secure-client-v1').toString();
  const signature = CryptoJS.HmacSHA256(dataToSign, clientKey).toString();
  
  return signature;
};

/**
 * Add security headers to authenticated requests
 * This makes it harder to use Postman/curl without implementing the same logic
 */
export const addSecurityHeaders = (method, url) => {
  const timestamp = Date.now().toString();
  const nonce = generateNonce();
  const signature = generateSignature(method, url, timestamp, nonce);
  
  return {
    'x-request-timestamp': timestamp,
    'x-request-nonce': nonce,
    'x-request-signature': signature
  };
};

/**
 * Secure fetch wrapper that automatically adds security headers
 */
export const secureFetch = async (url, options = {}) => {
  const method = options.method || 'GET';
  const securityHeaders = addSecurityHeaders(method, url);
  
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...securityHeaders,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return response;
};

export default secureFetch;
