const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');

const nitroModulesDir = [
  path.resolve(__dirname, 'node_modules/react-native-nitro-modules'),
  path.resolve(root, 'node_modules/react-native-nitro-modules'),
].find((dir) => require('fs').existsSync(dir));

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native-metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    blockList: [
      new RegExp(`^${path.resolve(root, 'node_modules/react')}([/\\\\].*)?$`),
      new RegExp(`^${path.resolve(root, 'node_modules/react-native')}([/\\\\].*)?$`),
    ],
    extraNodeModules: {
      'rn-document-scanner': root,
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
      ...(nitroModulesDir
        ? { 'react-native-nitro-modules': nitroModulesDir }
        : {}),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

