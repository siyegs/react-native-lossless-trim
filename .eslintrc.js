// ESLint config for the module source. eslint-config-universe ships with
// expo-module-scripts; `expo-module lint` wires the rest.
module.exports = {
  root: true,
  extends: ['universe/native'],
  ignorePatterns: ['build', 'example'],
};
