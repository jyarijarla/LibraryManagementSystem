/**
 * Example: Migrating API Calls to Use Secure Requests
 * 
 * This file shows how to update existing fetch calls to use the secureFetch wrapper
 */

import secureFetch from '../utils/secureRequest';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ========================================
// BEFORE: Standard fetch (vulnerable)
// ========================================

async function fetchStudentsOLD() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/students`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }
  
  return await response.json();
}

// ========================================
// AFTER: Secure fetch (protected)
// ========================================

async function fetchStudentsNEW() {
  const response = await secureFetch(`${API_URL}/students`, {
    method: 'GET'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }
  
  return await response.json();
}

// ========================================
// Example 1: GET Request
// ========================================

// BEFORE
async function getOverdueItems_OLD() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/reports/overdue-items`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// AFTER
async function getOverdueItems_NEW() {
  const response = await secureFetch(`${API_URL}/reports/overdue-items`);
  return await response.json();
}

// ========================================
// Example 2: POST Request with Body
// ========================================

// BEFORE
async function createMember_OLD(memberData) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(memberData)
  });
  return await response.json();
}

// AFTER
async function createMember_NEW(memberData) {
  const response = await secureFetch(`${API_URL}/members`, {
    method: 'POST',
    body: JSON.stringify(memberData)
  });
  return await response.json();
}

// ========================================
// Example 3: PUT Request
// ========================================

// BEFORE
async function updateStudent_OLD(studentId, updates) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/members/${studentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return await response.json();
}

// AFTER
async function updateStudent_NEW(studentId, updates) {
  const response = await secureFetch(`${API_URL}/members/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return await response.json();
}

// ========================================
// Example 4: DELETE Request
// ========================================

// BEFORE
async function deleteMember_OLD(memberId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/members/${memberId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// AFTER
async function deleteMember_NEW(memberId) {
  const response = await secureFetch(`${API_URL}/members/${memberId}`, {
    method: 'DELETE'
  });
  return await response.json();
}

// ========================================
// Example 5: File Upload (FormData)
// ========================================

// BEFORE
async function uploadFile_OLD(formData) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Don't set Content-Type for FormData, browser sets it automatically
    },
    body: formData
  });
  return await response.json();
}

// AFTER
async function uploadFile_NEW(formData) {
  // For FormData, don't include Content-Type header
  const response = await secureFetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      // Remove Content-Type, let browser set it with boundary
    },
    body: formData
  });
  return await response.json();
}

// ========================================
// Example 6: Parallel Requests
// ========================================

// BEFORE
async function fetchDashboardData_OLD() {
  const token = localStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  const [students, books, borrowRecords] = await Promise.all([
    fetch(`${API_URL}/students`, { headers }).then(r => r.json()),
    fetch(`${API_URL}/assets/books`, { headers }).then(r => r.json()),
    fetch(`${API_URL}/borrow-records`, { headers }).then(r => r.json())
  ]);
  
  return { students, books, borrowRecords };
}

// AFTER
async function fetchDashboardData_NEW() {
  const [students, books, borrowRecords] = await Promise.all([
    secureFetch(`${API_URL}/students`).then(r => r.json()),
    secureFetch(`${API_URL}/assets/books`).then(r => r.json()),
    secureFetch(`${API_URL}/borrow-records`).then(r => r.json())
  ]);
  
  return { students, books, borrowRecords };
}

// ========================================
// Example 7: Error Handling
// ========================================

// BEFORE
async function fetchWithErrorHandling_OLD() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/students`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}

// AFTER (Same error handling works)
async function fetchWithErrorHandling_NEW() {
  try {
    const response = await secureFetch(`${API_URL}/students`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}

// ========================================
// Example 8: React Component Usage
// ========================================

import { useState, useEffect } from 'react';

// BEFORE
function StudentsListOLD() {
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    const fetchStudents = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setStudents(data);
    };
    
    fetchStudents();
  }, []);
  
  return <div>{/* render students */}</div>;
}

// AFTER
function StudentsListNEW() {
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    const fetchStudents = async () => {
      const response = await secureFetch(`${API_URL}/students`);
      const data = await response.json();
      setStudents(data);
    };
    
    fetchStudents();
  }, []);
  
  return <div>{/* render students */}</div>;
}

// ========================================
// Example 9: Query Parameters
// ========================================

// BEFORE
async function searchMembers_OLD(searchTerm, role) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({
    search: searchTerm,
    role: role
  });
  
  const response = await fetch(`${API_URL}/members?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}

// AFTER
async function searchMembers_NEW(searchTerm, role) {
  const params = new URLSearchParams({
    search: searchTerm,
    role: role
  });
  
  const response = await secureFetch(`${API_URL}/members?${params}`);
  return await response.json();
}

// ========================================
// Example 10: Custom Headers
// ========================================

// BEFORE
async function fetchWithCustomHeaders_OLD() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/reports/custom`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Custom-Header': 'custom-value'
    }
  });
  return await response.json();
}

// AFTER (Custom headers still work)
async function fetchWithCustomHeaders_NEW() {
  const response = await secureFetch(`${API_URL}/reports/custom`, {
    headers: {
      'X-Custom-Header': 'custom-value'
      // secureFetch automatically adds Authorization and security headers
    }
  });
  return await response.json();
}

// ========================================
// What secureFetch Does Automatically
// ========================================

/**
 * The secureFetch wrapper automatically:
 * 
 * 1. Adds Authorization header from localStorage token
 * 2. Adds Content-Type: application/json
 * 3. Generates unique nonce (x-request-nonce)
 * 4. Adds current timestamp (x-request-timestamp)
 * 5. Creates HMAC signature (x-request-signature)
 * 6. Merges with any custom headers you provide
 * 
 * This prevents:
 * - Postman/curl usage without proper implementation
 * - Token theft and reuse from different devices
 * - Replay attacks
 * - Request tampering
 */

// ========================================
// Migration Checklist
// ========================================

/**
 * Files to update (search for "fetch(" in these files):
 * 
 * Priority 1 (Critical):
 * - client/src/pages/Login/Login.jsx (login/signup requests)
 * - client/src/pages/Librarian/Librarian.jsx (all authenticated requests)
 * - client/src/pages/Admin/Admin.jsx (all authenticated requests)
 * 
 * Priority 2 (Important):
 * - client/src/pages/LibrarianReport/LibrarianReport.jsx
 * - client/src/pages/Student/Dashboard.jsx
 * - client/src/pages/Student/Assets.jsx
 * 
 * Priority 3 (If exists):
 * - Any other components making API calls
 * 
 * Steps:
 * 1. Import secureFetch at top of file
 * 2. Find all fetch() calls
 * 3. Replace with secureFetch()
 * 4. Remove manual Authorization header setting
 * 5. Remove manual Content-Type header (for JSON)
 * 6. Test the feature
 * 7. Check browser console for errors
 */

export {
  fetchStudentsNEW,
  getOverdueItems_NEW,
  createMember_NEW,
  updateStudent_NEW,
  deleteMember_NEW,
  uploadFile_NEW,
  fetchDashboardData_NEW
};
