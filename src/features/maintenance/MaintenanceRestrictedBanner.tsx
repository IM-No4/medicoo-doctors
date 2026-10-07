import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { RootState } from '../../redux/store';

// Persistent (not dismissible) top banner shown whenever
// appConfig.restricted is true - i.e. maintenance is on, but this doctor
// has an in-progress consultation so they were let into the app rather
// than shown the full MaintenanceScreen. Purely informational - the
// actual "approving new requests is blocked" enforcement is the backend's
// maintenanceGate/inline check, not this banner.
export default function MaintenanceRestrictedBanner() {
    const insets = useSafeAreaInsets();
    const restricted = useSelector((state: RootState) => state.appConfig.restricted);

    if (!restricted) return null;

    return (
        <View style={[styles.container, { paddingTop: insets.top + 8 }]} pointerEvents="none">
            <View style={styles.pill}>
                <AlertTriangle size={14} color="#92400E" />
                <Text style={styles.text}>Limited availability - new requests can't be approved</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    text: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#92400E',
    },
});
