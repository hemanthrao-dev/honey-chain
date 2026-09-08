const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If token exists in sessionStorage/localStorage for fallback
  const savedToken = localStorage.getItem('honeychain_jwt_token');
  if (savedToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${savedToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Ensures httpOnly cookies are sent/received
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `HTTP error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // If backend server is not running, log cleanly
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.warn(`[HoneyChain API] Backend unreachable at ${url}.`);
    }
    throw err;
  }
}

export const api = {
  auth: {
    login: async (credentials) => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (res.token) {
        localStorage.setItem('honeychain_jwt_token', res.token);
      }
      return res;
    },
    register: async (userData) => {
      const res = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (res.token) {
        localStorage.setItem('honeychain_jwt_token', res.token);
      }
      return res;
    },
    logout: async () => {
      localStorage.removeItem('honeychain_jwt_token');
      return request('/auth/logout', { method: 'POST' });
    },
    getMe: () => request('/auth/me'),
  },

  beekeepers: {
    getAll: () => request('/beekeepers'),
    getById: (id) => request(`/beekeepers/${id}`),
    create: (data) => request('/beekeepers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/beekeepers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/beekeepers/${id}`, { method: 'DELETE' }),
  },

  batches: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/batches${qs ? `?${qs}` : ''}`);
    },
    getPending: () => request('/batches/pending'),
    create: (data) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
    approve: (batchId) => request(`/batches/${batchId}/approve`, { method: 'POST' }),
    reject: (batchId, reason) => request(`/batches/${batchId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    verifyCode: (batchId, code) => request(`/batches/${batchId}/verify-code`, { method: 'POST', body: JSON.stringify({ code }) }),
    getReadyCodes: (beekeeperId) => request(`/batches/ready-codes/${beekeeperId}`),
    verifyPublic: (batchId) => request(`/batches/verify/${batchId}`),
    getChainStatus: () => request('/batches/chain-status'),
    tamperDemo: (batchId, data) => request(`/batches/${batchId}/tamper-demo`, { method: 'POST', body: JSON.stringify(data) }),
    restoreDemo: () => request('/batches/restore-demo', { method: 'POST' }),
    delete: (batchId) => request(`/batches/${batchId}`, { method: 'DELETE' }),
  },
};

export default api;
