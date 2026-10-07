import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getLegalAcceptanceStatus } from '../../services/api/legal.api';

interface LegalState {
  required: boolean;
  checked: boolean;
}

const initialState: LegalState = {
  required: false,
  checked: false,
};

// Fails soft - a network error or unexpected response never sets
// `required: true`, so a transient bug here can't lock anyone out of the
// app. The backend's getAcceptanceStatus already fails closed the same way
// for the same reason.
export const checkLegalAcceptance = createAsyncThunk(
  'legal/checkAcceptance',
  async () => {
    try {
      const status = await getLegalAcceptanceStatus();
      return status.required;
    } catch {
      return false;
    }
  }
);

const legalSlice = createSlice({
  name: 'legal',
  initialState,
  reducers: {
    clearRequired(state) {
      state.required = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(checkLegalAcceptance.fulfilled, (state, action) => {
      state.required = action.payload;
      state.checked = true;
    });
  },
});

export const { clearRequired } = legalSlice.actions;
export default legalSlice.reducer;
