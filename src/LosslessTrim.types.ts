/** Options describing the range to keep out of the source video. */
export interface TrimOptions {
  /**
   * Start of the kept range, in milliseconds from the beginning of the source.
   *
   * On Android the real cut snaps back to the nearest keyframe at or before
   * this value (passthrough trims cannot start mid-GOP without re-encoding), so
   * the output may include up to ~1 GOP of pre-roll. iOS is frame-precise.
   * See the README "Platform differences" section.
   */
  startMs: number;
  /** End of the kept range, in milliseconds from the beginning of the source. */
  endMs: number;
}

/** Result of a successful trim. */
export interface TrimResult {
  /**
   * `file://` uri of the trimmed clip, written to the app cache directory. The
   * caller owns the file and should move or delete it when done.
   */
  uri: string;
}

/** Machine-readable code attached to every {@link TrimError}. */
export type TrimErrorCode =
  /** The native trim operation failed (bad source, unsupported codec, I/O). */
  | "ERR_TRIM"
  /** `startMs`/`endMs` were not a valid, non-empty, in-order range. */
  | "ERR_INVALID_RANGE"
  /** The source `uri` was empty or not a string. */
  | "ERR_INVALID_URI"
  /** The native module is not present in this build. */
  | "ERR_UNAVAILABLE";
