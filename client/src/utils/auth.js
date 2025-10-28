// Utility functions for making authenticated API requests

/**
 * Get user data from localStorage
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Get user ID from localStorage
 */
export function getUserId() {
  return localStorage.getItem('userId');
}

/**
 * Get user role from localStorage
 */
export function getUserRole() {
  return localStorage.getItem('role');
}

/**
 * Check if user is logged in
 */
export function isAuthenticated() {
  return !!getUserId();
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
}

/**
 * Make an authenticated API request
 * Automatically includes user ID and role in headers
 */
export async function authenticatedFetch(url, options = {}) {
  const userId = getUserId();
  const role = getUserRole();

  if (!userId || !role) {
    throw new Error('User not authenticated');
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-role': role,
    ...options.headers
  };

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
