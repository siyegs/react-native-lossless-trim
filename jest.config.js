// The public API is plain TypeScript that fully mocks `expo-modules-core`, so it
// needs no React Native runtime. We run it under ts-jest in a node environment
// rather than the multi-project RN preset (whose native environments pull in
// react-native's Flow-typed jest setup). tsc/build already does type-checking,
// so isolatedModules keeps the run fast. The inline tsconfig overrides the
// package's "bundler" module resolution, which ts-jest's CommonJS emit rejects.
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        isolatedModules: true,
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
};
