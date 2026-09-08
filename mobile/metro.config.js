const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(repoRoot, "shared")];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules")
];

config.resolver.disableHierarchicalLookup = false;

module.exports = config;
