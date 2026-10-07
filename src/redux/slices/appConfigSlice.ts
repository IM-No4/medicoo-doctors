import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { AppUpdateInfo, getAppConfig, MaintenanceInfo } from '../../services/api/appConfig.api';

interface AppConfigState {
  // null means "no update known" - a failed/pending fetch must never be
  // read as update-required or update-available by any consumer of this.
  update: AppUpdateInfo | null;
  // null means "no maintenance info known" - treated the same as "not in
  // maintenance" by every consumer, never as "maintenance is on."
  maintenance: MaintenanceInfo | null;
  // Computed by BootCoordinator.ts (not server-sent directly) once
  // maintenance.enabled is true: true means "let this doctor into the
  // app, but hide/disable approving anything new" - set only after a
  // specific journey-status check for THIS doctor, never inferred from
  // `maintenance` alone.
  restricted: boolean;
  loaded: boolean;
}

const initialState: AppConfigState = {
  update: null,
  maintenance: null,
  restricted: false,
  loaded: false,
};

export const loadAppConfig = createAsyncThunk('appConfig/load', async () => {
  const config = await getAppConfig();
  return config;
});

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    setMaintenanceRestricted(state, action: { payload: boolean }) {
      state.restricted = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadAppConfig.fulfilled, (state, action) => {
      state.update = action.payload?.update ?? null;
      state.maintenance = action.payload?.maintenance ?? null;
      // Every fresh config fetch (cold boot, foreground recheck) starts
      // from "not restricted" and lets BootCoordinator re-derive it - a
      // stale `restricted: true` from a previous session must never
      // survive maintenance being turned off.
      if (!action.payload?.maintenance?.enabled) {
        state.restricted = false;
      }
      state.loaded = true;
    });
    // A failed fetch keeps `update: null` and `maintenance: null` rather
    // than guessing.
    builder.addCase(loadAppConfig.rejected, (state) => {
      state.update = null;
      state.maintenance = null;
      state.restricted = false;
      state.loaded = true;
    });
  },
});

export const { setMaintenanceRestricted } = appConfigSlice.actions;

export default appConfigSlice.reducer;
