import { configureStore } from '@reduxjs/toolkit';
import bootreducer from '../bootstrap/boot.slice';
import authReducer from './slices/authSlice';
import legalReducer from './slices/legalSlice';
import notificationReducer from './slices/notificationSlice';
import profileReducer from './slices/profileSlice';
import appLifecycleReducer from './slices/appLifecycleSlice';
import appConfigReducer from './slices/appConfigSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationReducer,
    boot: bootreducer,
    legal: legalReducer,
    profile: profileReducer,
    appLifecycle: appLifecycleReducer,
    appConfig: appConfigReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
