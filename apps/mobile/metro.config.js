const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');

config.watchFolders = [
  path.resolve(workspaceRoot, 'packages'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver = {
  ...config.resolver,
  disableHierarchicalLookup: false,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    '@carloi-v4/types': path.resolve(workspaceRoot, 'packages', 'types'),
    '@carloi-v4/ui': path.resolve(workspaceRoot, 'packages', 'ui'),
  },
};

module.exports = config;
