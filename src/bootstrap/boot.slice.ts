import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BootState } from './boot.types';

const initialState: BootState = {
  status: 'idle',
  isAuthenticated: false,
  onboardingCompleted: false,
  initialRoute: null,
  deepLinkIntent: null,
  isSlow: false,
};

const bootSlice = createSlice({
  name: 'boot',
  initialState,
  reducers: {
    bootStart(state) {
      state.status = 'loading';
      state.isSlow = false;
    },
    setBootSlow(state, action: PayloadAction<boolean>) {
      state.isSlow = action.payload;
    },
    bootSuccess(state, action: PayloadAction<Partial<BootState>>) {
      Object.assign(state, action.payload);
      state.status = 'ready';
      state.isSlow = false;
    },
    bootFail(state) {
      state.status = 'error';
      state.isSlow = false;
    },
    bootMandatoryUpdate(state) {
      state.status = 'mandatoryUpdate';
      state.isSlow = false;
    },
    bootMaintenance(state) {
      state.status = 'maintenance';
      state.isSlow = false;
    },
    setOnboardingCompleted(state) {
      state.onboardingCompleted = true;
    },
    setDeepLinkIntent(state, action) {
      state.deepLinkIntent = action.payload;
    },
    clearDeepLinkIntent(state) {
      state.deepLinkIntent = null;
    },
  },
});

export const {
  bootStart,
  setBootSlow,
  bootSuccess,
  bootFail,
  bootMandatoryUpdate,
  bootMaintenance,
  setOnboardingCompleted,
  setDeepLinkIntent,
  clearDeepLinkIntent,
} = bootSlice.actions;

export default bootSlice.reducer;
