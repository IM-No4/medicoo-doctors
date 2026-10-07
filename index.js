import messaging from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import App from './src/app/App';
import { installGlobalAppFont } from './src/bootstrap/globalFont';

// Must run before the app's first render - see globalFont.ts for why this
// can't just be Text.defaultProps.
installGlobalAppFont();

// Must be registered outside the React tree - handles data-only FCM
// messages received while the app is backgrounded/killed. Notification-type
// messages are shown by the OS automatically without this.
messaging().setBackgroundMessageHandler(async () => {});

registerRootComponent(App);
