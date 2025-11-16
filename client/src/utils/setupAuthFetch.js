export function setupAuthFetchInterceptor() {
  if (window.__AUTH_FETCH_PATCHED__) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const token = localStorage.getItem('token');
    const url = typeof input === 'string' ? input : input?.url;

    // Only attach token to protected routes
    const shouldAttachToken =
      token &&
      url &&
      !url.includes('/api/login') &&
      !url.includes('/api/signup');

    // Clone init safely to avoid losing method/body
    const finalInit = {
      ...init,
      headers: new Headers(init.headers || {})
    };

    if (shouldAttachToken) {
      finalInit.headers.set('Authorization', `Bearer ${token}`);
    }

    let response;
    try {
      response = await nativeFetch(input, finalInit);
    } catch (err) {
      console.error('Network or fetch interceptor error:', err);
      throw err;
    }

    // Handle expired token, but prevent infinite redirects
    if (response.status === 401 && !url.includes('/api/login')) {
      console.warn('401 Unauthorized → redirecting to login');
      localStorage.clear();
      window.location.assign('/login');
    }

    return response;
  };

  window.__AUTH_FETCH_PATCHED__ = true;
}
