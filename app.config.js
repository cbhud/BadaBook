const baseConfig = require('./app.json');

const sizeOptimizedAndroid =
  process.env.SIZE_OPTIMIZED_ANDROID === 'true' ||
  process.env.EAS_BUILD_PROFILE === 'preview';

module.exports = () => {
  const config = JSON.parse(JSON.stringify(baseConfig.expo));

  config.plugins = [
    'expo-status-bar',
    [
      'expo-document-picker',
      {
        iCloudContainerEnvironment: 'Production',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enableBundleCompression: true,
          enablePngCrunchInReleaseBuilds: true,
          ...(sizeOptimizedAndroid
            ? {
                buildArchs: ['arm64-v8a'],
              }
            : {}),
        },
      },
    ],
  ];

  return config;
};
