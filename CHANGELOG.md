# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-07-21

### Added

- `CHANGELOG.md` is now included in the published package, so the release
  history is available from the installed module and on npm.

### Changed

- Releases are now published with npm OIDC trusted publishing instead of a
  long-lived access token. No credential is stored anywhere; the workflow mints
  a short-lived one per run and attaches provenance automatically.

## [0.1.0] - 2026-07-21

Initial release.

### Added

- `trimAsync(uri, { startMs, endMs })` - lossless, ffmpeg-free video trim that
  resolves to a `file://` uri for the trimmed clip.
- `isAvailable()` - reports whether the native module is present in the current
  build (returns `false` in Expo Go).
- `TrimError` with stable `code` values: `ERR_INVALID_URI`,
  `ERR_INVALID_RANGE`, `ERR_UNAVAILABLE`, and `ERR_TRIM`.
- iOS implementation using `AVAssetExportSession` passthrough, which writes an
  edit list and is therefore frame-precise.
- Android implementation using `MediaExtractor` + `MediaMuxer` stream copy,
  including the shared-keyframe-origin fix that keeps audio and video in sync
  (both tracks are rebased onto one origin; samples that rebase negative are
  dropped, since `MediaMuxer` rejects negative presentation times). The source
  rotation is carried through as the muxer's orientation hint.
- Pure `TrimTimeline` timing logic on Android with JVM unit tests, so the
  A/V-sync invariant is locked in and verifiable without a device.
- TypeScript types, New Architecture (Fabric) support, and an example app.

### Known limitations

- On Android the cut starts at the nearest keyframe at or before `startMs`
  (up to roughly one GOP of pre-roll), because `MediaMuxer` has no edit-list
  API and a video stream cannot begin mid-GOP without re-encoding. iOS is
  frame-precise. The end of the range is precise on both platforms. See the
  "Platform differences" section of the README.
- Requires a custom dev client or a release build; it does not run in Expo Go.

[Unreleased]: https://github.com/siyegs/react-native-lossless-trim/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/siyegs/react-native-lossless-trim/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/siyegs/react-native-lossless-trim/releases/tag/v0.1.0
