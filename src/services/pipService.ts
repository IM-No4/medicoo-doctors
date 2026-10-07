import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { PipModule } = NativeModules;
const eventEmitter = PipModule ? new NativeEventEmitter(PipModule) : null;

export const pipService = {
    setCallActive: (active: boolean) => {
        if (Platform.OS === 'android' && PipModule?.setCallActive) {
            PipModule.setCallActive(active);
        }
    },

    enterPipMode: () => {
        if (Platform.OS === 'android' && PipModule?.enterPipMode) {
            PipModule.enterPipMode();
        }
    },

    addPipModeListener: (callback: (isInPip: boolean) => void) => {
        if (!eventEmitter) return { remove: () => {} };
        const subscription = eventEmitter.addListener('onPipModeChanged', (event) => {
            callback(!!event?.isInPip);
        });
        return subscription;
    },

    addUserLeaveListener: (callback: () => void) => {
        if (!eventEmitter) return { remove: () => {} };
        const subscription = eventEmitter.addListener('onUserLeave', () => {
            callback();
        });
        return subscription;
    },
};
