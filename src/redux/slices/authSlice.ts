import { createSlice } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  mobile: string | null;
}

const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  onboardingComplete: false,
  mobile: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.onboardingComplete = action.payload.onboardingComplete ?? false;
      if (action.payload.mobile) state.mobile = action.payload.mobile;
    },
    completeOnboarding(state) {
      state.onboardingComplete = true;
    },
    logout(state) {
      return initialState;
    },
  },
});

export const { loginSuccess, completeOnboarding, logout } = authSlice.actions;
export default authSlice.reducer;
