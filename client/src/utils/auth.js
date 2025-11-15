// Utility functions for making authenticated API requests

/**
 * Get user data from localStorage
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getUserId() {
  const user = getUser();
  if (user?.id) {
    return user.id.toString();
  }
  return localStorage.getItem('userId');
}

export function getUserRole() {
  return localStorage.getItem('role');
}

export function isAuthenticated() {
  return !!getToken();
}

/**
 * Check if user is admin
 */
export function isAdmin() {
  return getUserRole() === 'admin';
}

/**
 * Check if user is student
 */
export function isStudent() {
  return getUserRole() === 'student';
}

/**
 * Logout user (clear localStorage)
 */
export function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  localStorage.removeItem('token');
}

/**
 * Make an authenticated API request
 * Automatically includes user ID and role in headers
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('User not authenticated');
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers
  });

  // If unauthorized, clear localStorage and redirect to login
  if (response.status === 401) {
    logout();
    window.location.href = '/';
    throw new Error('Session expired. Please login again.');
  }

  return response;
}

/**
 * GET request with authentication
 */
export async function get(url) {
  return authenticatedFetch(url, { method: 'GET' });
}

/**
 * POST request with authentication
 */
export async function post(url, data) {
  return authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PUT request with authentication
 */
export async function put(url, data) {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request with authentication
 */
export async function del(url) {
  return authenticatedFetch(url, { method: 'DELETE' });
}
