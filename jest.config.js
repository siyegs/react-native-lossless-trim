// Uses the expo-module-scripts jest preset (babel + ts) so the TypeScript
// public API is tested on plain Node with the native binding mocked.
module.exports = {
  preset: 'expo-module-scripts/jest-preset',
  testMatch: ['**/src/**/*.test.ts'],
};
