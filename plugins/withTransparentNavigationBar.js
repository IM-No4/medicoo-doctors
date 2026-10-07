const { withAndroidStyles } = require('expo/config-plugins');

// The official "expo-navigation-bar" plugin (see app.json, configured with
// backgroundColor: "transparent") sets android:navigationBarColor, but
// doesn't touch android:enforceNavigationBarContrast - Android still
// paints a translucent white/black scrim behind the nav bar for icon
// legibility whenever that's left at its default (true), which is what
// was actually making an otherwise-transparent bar look like a solid
// white one. This turns that off on the app's main theme only (not
// RazorpayCheckoutTheme, which keeps its own opaque white nav bar to
// match Razorpay's native checkout UI).
module.exports = function withTransparentNavigationBar(config) {
    return withAndroidStyles(config, (config) => {
        const styles = config.modResults;
        const appTheme = styles.resources.style?.find((s) => s.$.name === 'AppTheme');
        if (!appTheme) {
            return config;
        }

        const existing = appTheme.item?.find((i) => i.$.name === 'android:enforceNavigationBarContrast');
        if (existing) {
            existing._ = 'false';
        } else {
            if (!appTheme.item) appTheme.item = [];
            appTheme.item.push({
                $: { name: 'android:enforceNavigationBarContrast', 'tools:targetApi': '29' },
                _: 'false',
            });
        }

        return config;
    });
};
