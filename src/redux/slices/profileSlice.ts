import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getDoctorProfile } from '../../services/api/user.api';
import { loadProfileSummary, saveProfileSummary } from '../../services/storage/profileStorage';

export interface ProfileState {
  name: string | null;
  isDoctor: boolean;
  hasApprovedProfile: boolean;
  hasPendingChanges: boolean;
  approvalStatus: 'approved' | 'pending' | 'rejected' | 'draft' | null;
  data: any;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  name: null,
  isDoctor: false,
  hasApprovedProfile: false,
  hasPendingChanges: false,
  approvalStatus: null,
  data: null,
  loading: false,
  error: null,
};

export const loadProfileCache = createAsyncThunk(
  'profile/loadCache',
  async () => {
    try {
      const summary = await loadProfileSummary();
      return summary;
    } catch {
      return null;
    }
  }
);

export const loadProfileFromServer = createAsyncThunk(
  'profile/loadFromServer',
  async () => {
    try {
      const res = await getDoctorProfile();
      const profile = res?.doctor || res?.profile || res?.data || res || {};
      const name =
        profile.approvedProfile?.displayName ||
        profile.displayName ||
        profile.name ||
        profile.user?.name ||
        null;

      if (name) {
        await saveProfileSummary({ name });
      }
      return profile;
    } catch (err: any) {
      console.warn('Failed to load profile from server:', err);
      throw err;
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileName(state, action: PayloadAction<string | null>) {
      state.name = action.payload;
    },
    clearProfile() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadProfileCache.fulfilled, (state, action) => {
      if (action.payload?.name && !state.name) {
        state.name = action.payload.name;
      }
    });

    builder.addCase(loadProfileFromServer.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(loadProfileFromServer.fulfilled, (state, action) => {
      const profile = action.payload || {};
      state.loading = false;
      state.data = profile;

      const name =
        profile.approvedProfile?.displayName ||
        profile.displayName ||
        profile.name ||
        profile.user?.name ||
        state.name;
      if (name) {
        state.name = name;
      }

      const isDoc = Boolean(
        profile.isDoctor || profile.role === 'doctor' || profile.user?.isDoctor
      );
      state.isDoctor = isDoc;

      const status =
        profile.approvalStatus || (profile.isApproved ? 'approved' : 'draft');
      state.approvalStatus = status;

      const approvedCheck = Boolean(
        status === 'approved' ||
        profile.lastApprovedAt ||
        profile.approvedAt ||
        profile.verifiedAt ||
        profile.isApproved ||
        profile.isOnboarded ||
        profile.onboardingCompleted ||
        (isDoc &&
          (profile.specialization ||
            profile.doctorType ||
            profile.registrationNumber))
      );
      state.hasApprovedProfile = approvedCheck;

      state.hasPendingChanges = Boolean(
        profile.pendingProfile || profile.hasPendingChanges
      );
    });

    builder.addCase(loadProfileFromServer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to load profile';
    });
  },
});

export const { setProfileName, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
