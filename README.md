# react-native-lossless-trim

**Lossless, ffmpeg-free video trimming for React Native and Expo.**

Trims a clip by stream-copying the encoded frames on the platform's own native
APIs (`AVAssetExportSession` passthrough on iOS, `MediaExtractor` + `MediaMuxer`
on Android). No re-encode, no ffmpeg, no multi-megabyte binary. The output is
bit-for-bit the same quality as the source, and the trim finishes in roughly the
time it takes to copy the bytes.

[![npm](https://img.shields.io/npm/v/react-native-lossless-trim.svg)](https://www.npmjs.com/package/react-native-lossless-trim)
[![CI](https://github.com/siyegs/react-native-lossless-trim/actions/workflows/ci.yml/badge.svg)](https://github.com/siyegs/react-native-lossless-trim/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/react-native-lossless-trim.svg)](./LICENSE)

> **Used in production.** This library is the trim engine in [Mystra](https://mystrahq.com), a shipping social app, verified on real iOS and Android devices as the code that performs every clip trim.

## Why this exists

Nearly every popular React Native trimming library bundles **ffmpeg**. That
carries real costs:

- **Size.** ffmpeg adds tens of megabytes of native binary to your app.
- **Quality.** ffmpeg-based trimmers re-encode the clip, so every trim is a fresh
  round of lossy compression (generational quality loss).
- **Speed and battery.** Re-encoding is CPU-bound and slow, and it drains
  battery, especially on longer clips.
- **Maintenance.** `ffmpeg-kit`, the foundation most of these libraries were
  built on, was **retired in 2025**. Libraries sitting on it are now on borrowed
  time.

Every mobile OS already ships a native, hardware-friendly way to copy encoded
media samples from one container into another without touching the pixels. This
package uses exactly that. The result:

| | ffmpeg-based trimmers | react-native-lossless-trim |
| --- | --- | --- |
| Re-encode | Yes (lossy) | **No (lossless)** |
| Added binary size | Tens of MB | **~0** |
| Speed | CPU-bound, slow | **Near-instant (byte copy)** |
| Battery | Heavy | **Light** |
| Depends on retired ffmpeg-kit | Often | **Never** |

## Installation

```sh
npx expo install react-native-lossless-trim
```

This is an [Expo module](https://docs.expo.dev/modules/overview/). It needs a
**custom dev client or a release build** (`npx expo prebuild` then run, or an EAS
build). It does **not** run in Expo Go, because Expo Go cannot load custom native
code. Bare React Native projects with autolinking work too.

New Architecture (Fabric) is fully supported.

## Usage

```ts
import { trimAsync, isAvailable } from 'react-native-lossless-trim';

// Keep the range from 1.0s to 5.0s of the source, losslessly.
const { uri } = await trimAsync(sourceUri, { startMs: 1000, endMs: 5000 });

// `uri` is a file:// path in the app cache directory. You own the file: move,
// upload, or delete it when you are done.
```

Guard against builds where the native module is missing (for example Expo Go):

```ts
if (!isAvailable()) {
  // fall back to another engine, or tell the user to use a dev/release build
}
```

Errors are typed:

```ts
import { trimAsync, TrimError } from 'react-native-lossless-trim';

try {
  const { uri } = await trimAsync(sourceUri, { startMs, endMs });
} catch (e) {
  if (e instanceof TrimError) {
    // e.code: 'ERR_INVALID_URI' | 'ERR_INVALID_RANGE' | 'ERR_UNAVAILABLE' | 'ERR_TRIM'
  }
}
```

## Platform differences (read this)

Because passthrough copies whole encoded frames and never re-encodes, the two
platforms differ at the **start** of the cut:

- **iOS is frame-precise.** `AVAssetExportSession` writes an edit list, so the
  output begins exactly at `startMs`.
- **Android starts at the nearest keyframe at or before `startMs`.**
  `MediaMuxer` has no edit-list API, and a video stream can only begin on a sync
  (key) frame without re-encoding. So the Android output may include up to about
  one GOP (group of pictures, commonly 1 to 2 seconds) of extra footage before
  your requested start.

This is the fundamental trade of a no-re-encode trim: **lossless and fast, but
keyframe-bound on Android.** A frame-exact cut would require re-encoding the
leading GOP, which this library deliberately does not do. If you need
frame-exact output on Android, an ffmpeg-based re-encode is the tool for that
job, at the cost of quality, size, and speed.

The **end** of the cut is precise on both platforms.

### The Android A/V-sync fix

A naive Android passthrough desyncs audio and video. Video snaps back to its
keyframe while audio starts at the exact cut, so with absolute timestamps the two
tracks begin at different content times and the clip plays **audio ahead of the
picture**.

This library fixes it: it picks the video keyframe as a **single shared origin**
and rebases every sample of **both** tracks by that one value, which preserves
the real audio-to-video offset. Samples that rebase before the origin are dropped
(MediaMuxer rejects negative presentation times), and the source rotation is
carried through as the muxer's orientation hint. The timing math lives in a pure,
unit-tested `TrimTimeline` (see the JVM regression tests) so the invariant stays
locked in.

## API

### `trimAsync(uri, options): Promise<TrimResult>`

| Param | Type | Description |
| --- | --- | --- |
| `uri` | `string` | `file://` (both platforms) or `content://` (Android) uri of the source video. |
| `options.startMs` | `number` | Start of the kept range, in milliseconds. |
| `options.endMs` | `number` | End of the kept range, in milliseconds. Must be `> startMs`. |

Resolves to `{ uri }`, a `file://` uri to the trimmed clip in the cache
directory. Rejects with a `TrimError`.

### `isAvailable(): boolean`

Whether the native module is present in this build.

### `TrimError`

An `Error` subclass with a stable `code` field of type `TrimErrorCode`.

## Example app

A runnable demo lives in [`example/`](./example): pick a video, set a range, trim
it, and watch the source and the (near-instant) result side by side.

```sh
cd example
npm install
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

## Development

```sh
npm install
npm run build   # compile the TypeScript API
npm run lint    # eslint
npm test        # jest (JS API surface)
```

The Android A/V-sync math is unit-tested on the JVM via the example app's Gradle:

```sh
cd example/android
./gradlew :react-native-lossless-trim:testDebugUnitTest
```

## License

MIT (c) Iyegere Success Karboloo. See [LICENSE](./LICENSE).
