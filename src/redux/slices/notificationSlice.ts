import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type NotificationState = {
  unreadCount: number;
};

const initialState: NotificationState = {
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    incrementUnread(state) {
      state.unreadCount += 1;
    },
    clearUnread(state) {
      state.unreadCount = 0;
    },
  },
});

export const {
  setUnreadCount,
  incrementUnread,
  clearUnread,
} = notificationSlice.actions;

export default notificationSlice.reducer;
