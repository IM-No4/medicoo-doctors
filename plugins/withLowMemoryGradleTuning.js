const { withGradleProperties } = require('expo/config-plugins');

// This dev machine has only ~8GB RAM. Gradle's default parallel mode lets
// multiple native modules (Reanimated, Worklets, ble-plx, gesture-handler,
// Agora, ...) run their CMake/ninja C++ builds at the same time, and each
// one spawns a clang++ process per architecture (4x) - easily 10+ concurrent
// C++20 template-heavy compiles, which was crashing clang/ninja with
// out-of-memory signal kills (`clang frontend command failed due to signal`,
// `ninja: error: exception: 0xE06D7363`) rather than any real code error.
// Capping worker/module parallelism keeps peak concurrent compiles low
// enough to actually finish, at the cost of a slower build.
const PROPS = {
    'org.gradle.parallel': 'false',
    'org.gradle.workers.max': '2',
};

module.exports = function withLowMemoryGradleTuning(config) {
    return withGradleProperties(config, (config) => {
        const props = config.modResults;
        for (const [key, value] of Object.entries(PROPS)) {
            const existing = props.find((p) => p.type === 'property' && p.key === key);
            if (existing) {
                existing.value = value;
            } else {
                props.push({ type: 'property', key, value });
            }
        }
        return config;
    });
};
