import { store } from '../redux/store';
import { navigationRef } from './navigationRef';
import { ROUTES } from './routes';

export function navigate(
  routeKey: keyof typeof ROUTES,
  params?: any
) {
  const route = ROUTES[routeKey];
  const state = store.getState();

  if (route.requiresAuth && !state.boot.isAuthenticated) {
    navigationRef.navigate('Auth');
    return;
  }

  if (!navigationRef.isReady()) return;

  navigationRef.navigate(route.name, params);
}
