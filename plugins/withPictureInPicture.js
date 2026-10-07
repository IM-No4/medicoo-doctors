const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withPictureInPicture(config) {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults.manifest;
        const mainActivity = androidManifest.application?.[0]?.activity?.find(
            (a) => a.$['android:name'] === '.MainActivity'
        );

        if (mainActivity) {
            mainActivity.$['android:supportsPictureInPicture'] = 'true';
            const existingConfig = mainActivity.$['android:configChanges'] || '';
            if (!existingConfig.includes('smallestScreenSize')) {
                mainActivity.$['android:configChanges'] = existingConfig
                    ? `${existingConfig}|smallestScreenSize`
                    : 'smallestScreenSize';
            }
        }

        return config;
    });
};
