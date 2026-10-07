import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface NetworkContextValue {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  connectionType: NetInfoStateType;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
  showOnlineRecoveryBanner: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  connectionType: NetInfoStateType.unknown,
  isChecking: false,
  checkConnection: async () => true,
  showOnlineRecoveryBanner: false,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [netState, setNetState] = useState<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: NetInfoStateType;
  }>({
    isConnected: true,
    isInternetReachable: true,
    type: NetInfoStateType.unknown,
  });

  const [isChecking, setIsChecking] = useState(false);
  const [showOnlineRecoveryBanner, setShowOnlineRecoveryBanner] = useState(false);
  const wasOfflineRef = useRef(false);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStateChange = useCallback((state: NetInfoState) => {
    // If isConnected is explicitly false, or isInternetReachable is explicitly false
    const connected = state.isConnected ?? true;
    const reachable = state.isInternetReachable ?? true;
    const offline = state.isConnected === false || state.isInternetReachable === false;

    setNetState({
      isConnected: connected,
      isInternetReachable: reachable,
      type: state.type,
    });

    if (offline) {
      wasOfflineRef.current = true;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      setShowOnlineRecoveryBanner(false);
    } else if (wasOfflineRef.current && connected && reachable) {
      // We just recovered from offline state!
      wasOfflineRef.current = false;
      setShowOnlineRecoveryBanner(true);
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = setTimeout(() => {
        setShowOnlineRecoveryBanner(false);
      }, 3500);
    }
  }, []);

  useEffect(() => {
    // 1. Initial fetch
    NetInfo.fetch().then(handleStateChange).catch(() => {});

    // 2. Subscribe to network events
    const unsubscribe = NetInfo.addEventListener(handleStateChange);

    return () => {
      unsubscribe();
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, [handleStateChange]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const state = await NetInfo.refresh();
      handleStateChange(state);
      const isOnline = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      return isOnline;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [handleStateChange]);

  const isOffline = netState.isConnected === false || netState.isInternetReachable === false;

  return (
    <NetworkContext.Provider
      value={{
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        isOffline,
        connectionType: netState.type,
        isChecking,
        checkConnection,
        showOnlineRecoveryBanner,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
