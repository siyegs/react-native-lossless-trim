// ESLint 9 flat config. Extends the shared expo-module-scripts base (which wires
// eslint-config-universe for React Native + Node) and scopes linting to the
// module source only.
const base = require('expo-module-scripts/eslint.config.base.js');

module.exports = [
  {
    ignores: ['build/**', 'example/**', 'node_modules/**'],
  },
  ...base,
];
