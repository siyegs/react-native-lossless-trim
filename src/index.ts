import { TrimOptions, TrimResult } from "./LosslessTrim.types";
import { TrimError } from "./LosslessTrimError";
import LosslessTrimModule from "./LosslessTrimModule";

export { TrimError } from "./LosslessTrimError";
export { TrimOptions, TrimResult, TrimErrorCode } from "./LosslessTrim.types";

/**
 * Whether the native passthrough trimmer is present in this build. Returns
 * `false` in Expo Go and any build where the module was not linked, in which
 * case {@link trimAsync} throws `ERR_UNAVAILABLE`.
 */
export function isAvailable(): boolean {
  return LosslessTrimModule != null;
}

// A native output path may already be a file uri, or (defensively) a bare path.
function toFileUri(path: string): string {
  return path.startsWith("file://") || path.startsWith("content://")
    ? path
    : `file://${path}`;
}

/**
 * Trim the range [`startMs`, `endMs`] out of the video at `uri` WITHOUT
 * re-encoding it and resolve with a file uri to the trimmed clip.
 *
 * Uses only platform-native APIs (iOS `AVAssetExportSession` passthrough,
 * Android `MediaExtractor` + `MediaMuxer` stream copy). No ffmpeg: the trim is
 * lossless, near-instant, and adds essentially no binary weight.
 *
 * @param uri     `file://` (both platforms) or `content://` (Android) uri of the
 *                source video.
 * @param options `{ startMs, endMs }` range to keep, in milliseconds.
 * @throws {TrimError} `ERR_INVALID_URI` / `ERR_INVALID_RANGE` on bad input,
 *   `ERR_UNAVAILABLE` when the native module is absent, or `ERR_TRIM` when the
 *   native trim fails (unsupported codec, unreadable source, I/O error).
 */
export async function trimAsync(
  uri: string,
  options: TrimOptions,
): Promise<TrimResult> {
  if (typeof uri !== "string" || uri.length === 0) {
    throw new TrimError(
      "ERR_INVALID_URI",
      "A non-empty source uri is required.",
    );
  }

  const { startMs, endMs } = options ?? ({} as TrimOptions);
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    startMs < 0 ||
    endMs <= startMs
  ) {
    throw new TrimError(
      "ERR_INVALID_RANGE",
      `Invalid trim range: expected 0 <= startMs < endMs, got startMs=${startMs}, endMs=${endMs}.`,
    );
  }

  if (LosslessTrimModule == null) {
    throw new TrimError(
      "ERR_UNAVAILABLE",
      "The react-native-lossless-trim native module is not available in this build. " +
        "It requires a custom dev client or a release build (it does not run in Expo Go).",
    );
  }

  try {
    const outputPath = await LosslessTrimModule.trimVideo(uri, startMs, endMs);
    return { uri: toFileUri(outputPath) };
  } catch (error) {
    // Native rejections already carry a code; surface everything else as ERR_TRIM.
    const message =
      error instanceof Error
        ? error.message
        : "The video could not be trimmed.";
    throw new TrimError("ERR_TRIM", message);
  }
}
