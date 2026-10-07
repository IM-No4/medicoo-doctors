import { useDispatch } from 'react-redux';
import { bootSuccess } from '../../bootstrap/boot.slice';
import { logout as logoutRedux } from '../../redux/slices/authSlice';
import { AppDispatch } from '../../redux/store';
import { logoutApi } from '../../services/api/auth.api';
import { clearToken } from '../../utils/tokenManagement';

// Shared by DoctorOnboardingScreen (the account has no dashboard to log out
// from otherwise while unapproved) and DoctorSettingsScreen - this app has
// no Profile tab of its own to host a single logout entry point.
export function useLogout() {
    const dispatch = useDispatch<AppDispatch>();

    return async () => {
        try {
            await logoutApi();
        } catch {
            // Fall through - still clear local state so the user isn't stuck logged in.
        } finally {
            await clearToken('access_token');
            dispatch(logoutRedux());
            dispatch(bootSuccess({ isAuthenticated: false }));
        }
    };
}
