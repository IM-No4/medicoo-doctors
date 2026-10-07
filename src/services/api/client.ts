import axios from 'axios';
import { getToken, clearToken } from '../../utils/tokenManagement';
import { API_BASE_URL } from '../../config/env';
import { logout } from '../../redux/slices/authSlice';
import { bootSuccess } from '../../bootstrap/boot.slice';
// Type-only - erased at compile time, so it doesn't contribute to the
// runtime require graph (see the inline require() below for why that matters).
import type { AppDispatch } from '../../redux/store';

export { API_BASE_URL };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25 * 1000,
  headers: {
    'X-Client-Type': 'doctor-app',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let handlingUnauthorized = false;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // "Network Error" (no response at all - DNS/connection/timeout/thrown
    // before the request was ever sent) vs a real HTTP error status is a
    // useful distinction that's otherwise easy to lose by the time an error
    // reaches a screen's catch block.
    if (!error.response) {
      console.log('[apiClient] Request failed with no response:', {
        url: `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        method: error.config?.method,
        code: error.code,
        message: error.message,
      });
    }

    // Only force a logout for a request that was actually sent with a token -
    // pre-login endpoints (send-otp, verify-otp, ...) never attach one, so a
    // 401 there means bad credentials, not a revoked/expired session.
    const wasAuthenticatedRequest = Boolean(error.config?.headers?.Authorization);

    if (error.response?.status === 401 && wasAuthenticatedRequest && !handlingUnauthorized) {
      handlingUnauthorized = true;
      try {
        await clearToken('access_token');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { store } = require('../../redux/store') as { store: { dispatch: AppDispatch } };
        store.dispatch(logout());
        store.dispatch(bootSuccess({ isAuthenticated: false, onboardingCompleted: false }));
      } finally {
        handlingUnauthorized = false;
      }
    }

    return Promise.reject(error);
  }
);
