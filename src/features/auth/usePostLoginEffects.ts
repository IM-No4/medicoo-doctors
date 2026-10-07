import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { syncPushToken } from '../../bootstrap/pushNotifications';
import { RootState } from '../../redux/store';
import { initializeSocket, resetSocketState } from '../../services/socketService';

export function usePostLoginEffects() {
  const boot = useSelector((state: RootState) => state.boot);

  const isReady = boot.status === 'ready' && boot.isAuthenticated;

  useEffect(() => {
    if (isReady) {
      initializeSocket();
      syncPushToken();
      return;
    }

    resetSocketState();
  }, [isReady]);
}
