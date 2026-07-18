package com.reactnativelosslesstrim

/**
 * Pure timing math for the Android passthrough trim. Deliberately free of any
 * Android imports so the A/V-sync invariant can be unit-tested on the plain JVM
 * (see TrimTimelineTest) without a device or emulator.
 *
 * Why this exists at all - the A/V sync fix:
 * A passthrough (stream-copy) trim cannot re-encode, so video can only begin on
 * a sync (key) frame. The requested start therefore snaps back to the nearest
 * keyframe at or before it. Audio, by contrast, can begin at any sample.
 *
 * The bug this guards against: seeking each track independently to the requested
 * start and writing absolute timestamps makes the tracks begin at different
 * content times - video jumps back to its keyframe while audio starts at the cut
 * - so the trimmed clip plays audio AHEAD of the picture. The fix is to pick a
 * SINGLE shared origin (the video keyframe) and rebase every sample of BOTH
 * tracks by it, which preserves the real audio-to-video offset. Samples that
 * rebase negative (a little audio that precedes the keyframe) are dropped,
 * because MediaMuxer rejects negative presentation times.
 */
object TrimTimeline {

  /**
   * The shared origin both tracks are rebased against.
   *
   * @param startUs      the requested start, in microseconds.
   * @param videoSyncUs  sample time of the nearest video sync frame at or before
   *                     `startUs` (from MediaExtractor.SEEK_TO_PREVIOUS_SYNC), or
   *                     `null` when the source has no video track.
   * @return the video keyframe time when it is a valid point before `startUs`,
   *         otherwise `startUs` itself (audio-only sources, or no earlier sync).
   */
  fun originUs(startUs: Long, videoSyncUs: Long?): Long {
    if (videoSyncUs != null && videoSyncUs in 0 until startUs) {
      return videoSyncUs
    }
    return startUs
  }

  /** Rebase an absolute sample time onto the shared origin. May be negative. */
  fun rebase(sampleTimeUs: Long, originUs: Long): Long = sampleTimeUs - originUs

  /**
   * Whether extraction of a track should STOP at this sample: either the
   * extractor is exhausted (negative time) or we have passed the requested end.
   */
  fun isPastEnd(sampleTimeUs: Long, endUs: Long): Boolean =
    sampleTimeUs < 0L || sampleTimeUs > endUs

  /**
   * Whether a sample must be DROPPED rather than written: its rebased time is
   * negative, i.e. it sits before the shared origin. Keeps the first written
   * timestamp at or above zero so MediaMuxer accepts it.
   */
  fun shouldDrop(rebasedUs: Long): Boolean = rebasedUs < 0L
}
