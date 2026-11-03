import { palette } from '../theme/palette';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  Calendar,
  Clock,
  LayoutDashboard,
  Wallet,
} from 'lucide-react-native';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface TabItemConfig {
  name: string;
  label: string;
  Icon: any;
}

const TAB_CONFIGS: Record<string, TabItemConfig> = {
  DoctorDashboard: {
    name: 'DoctorDashboard',
    label: 'Home',
    Icon: LayoutDashboard,
  },
  ManageAppointments: {
    name: 'ManageAppointments',
    label: 'Appointments',
    Icon: Calendar,
  },
  ManageAvailability: {
    name: 'ManageAvailability',
    label: 'Schedule',
    Icon: Clock,
  },
  DoctorEarnings: {
    name: 'DoctorEarnings',
    label: 'Earnings',
    Icon: Wallet,
  },
};

export default function DoctorBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // The bottom menu should ONLY show on the Home screen
  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;
  if (currentRouteName !== 'DoctorDashboard') {
    return null;
  }

  // Hide bottom tab bar if the current screen requested tabBarStyle: { display: 'none' } (e.g. modals, sidebar)
  const focusedDescriptor = descriptors[currentRoute?.key];
  const tabBarStyle = focusedDescriptor?.options?.tabBarStyle as any;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  const bgColor = theme.card;
  const borderColor = theme.border;
  const activeColor = palette.primary;
  const inactiveColor = theme.textMuted;
  const activeBg = isDark ? palette.rgba_15_187_161_12 : palette.rgba_15_187_161_8;

  // Calculate bottom padding for home indicator / navigation bar
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 8);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIGS[route.name] || {
            name: route.name,
            label: route.name,
            Icon: LayoutDashboard,
          };
          const IconComp = config.Icon;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel || config.label}
              testID={`tab-${route.name}`}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabBtn}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconWrap,
                  isFocused && [styles.iconWrapActive, { backgroundColor: activeBg }],
                ]}
              >
                <IconComp
                  size={20}
                  color={isFocused ? activeColor : inactiveColor}
                  strokeWidth={isFocused ? 2.3 : 1.9}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>

              {isFocused && <View style={[styles.activeIndicatorDot, { backgroundColor: activeColor }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  iconWrapActive: {},
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
