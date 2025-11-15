export function setupAuthFetchInterceptor() {
  if (window.__AUTH_FETCH_PATCHED__) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const token = localStorage.getItem('token');
    let requestUrl = '';

    if (typeof input === 'string') {
      requestUrl = input;
    } else if (input && typeof input.url === 'string') {
      requestUrl = input.url;
    }

    const shouldAttachToken =
      Boolean(token) &&
      requestUrl &&
      !requestUrl.includes('/api/login') &&
      !requestUrl.includes('/api/signup');

    let nextInit = init;
    if (shouldAttachToken) {
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      nextInit = { ...init, headers };
    }

    const response = await nativeFetch(input, nextInit);

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
      if (!requestUrl.includes('/api/login')) {
        window.location.href = '/login';
      }
    }

    return response;
  };

  window.__AUTH_FETCH_PATCHED__ = true;
}
