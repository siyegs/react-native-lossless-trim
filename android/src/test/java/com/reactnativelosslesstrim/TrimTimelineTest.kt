package com.reactnativelosslesstrim

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Regression tests for the Android passthrough A/V-sync fix.
 *
 * These lock in the invariant that both tracks are rebased against a SINGLE
 * shared origin (the video keyframe), which is what keeps audio aligned with
 * the picture. They run on the plain JVM - no device, no emulator - which is
 * exactly why the timing math lives in [TrimTimeline] apart from the Android
 * MediaExtractor/MediaMuxer plumbing.
 */
class TrimTimelineTest {

  // Requested cut at 1.000s. The nearest video keyframe sits at 0.800s (video
  // can only start on a sync frame). Audio can start anywhere.
  private val startUs = 1_000_000L
  private val videoKeyframeUs = 800_000L

  @Test
  fun `origin is the video keyframe at or before the requested start`() {
    // The shared origin must snap back to the keyframe, not the requested start.
    assertEquals(videoKeyframeUs, TrimTimeline.originUs(startUs, videoKeyframeUs))
  }

  @Test
  fun `origin falls back to the requested start for an audio-only source`() {
    // No video track -> no keyframe -> nothing to snap to.
    assertEquals(startUs, TrimTimeline.originUs(startUs, null))
  }

  @Test
  fun `origin falls back to the requested start when the extractor reports no earlier sample`() {
    // MediaExtractor.sampleTime returns -1 when there is no sample; must not be
    // treated as a valid origin.
    assertEquals(startUs, TrimTimeline.originUs(startUs, -1L))
  }

  @Test
  fun `origin ignores a sync time that is not strictly before the start`() {
    // A keyframe exactly at (or after) the start is not an earlier origin.
    assertEquals(startUs, TrimTimeline.originUs(startUs, startUs))
    assertEquals(startUs, TrimTimeline.originUs(startUs, startUs + 5_000L))
  }

  @Test
  fun `the video keyframe rebases to zero - the clip starts on the picture`() {
    val origin = TrimTimeline.originUs(startUs, videoKeyframeUs)
    assertEquals(0L, TrimTimeline.rebase(videoKeyframeUs, origin))
  }

  @Test
  fun `shared origin preserves the audio-to-video offset - THE fix`() {
    // This is the bug. Audio's first kept sample is at the requested cut
    // (1.000s), which is 0.200s AFTER the video keyframe origin (0.800s). With a
    // shared origin, that audio sample rebases to +0.200s, so it plays 0.200s
    // into the clip - exactly where it belongs relative to the picture.
    val origin = TrimTimeline.originUs(startUs, videoKeyframeUs)
    val audioSampleUs = 1_000_000L

    val rebasedAudio = TrimTimeline.rebase(audioSampleUs, origin)

    assertEquals(200_000L, rebasedAudio)

    // The regression guard: had each track been rebased by its OWN first sample
    // (the old, broken behavior), this audio would have landed at 0 and played
    // 0.200s AHEAD of the picture. Assert it is NOT zero.
    assertFalse("audio must not collapse onto the video origin", rebasedAudio == 0L)
  }

  @Test
  fun `audio that precedes the video keyframe is dropped so the first timestamp is non-negative`() {
    // A little audio can exist between the keyframe origin and... actually before
    // it: an audio sample at 0.750s sits before the 0.800s origin, so it rebases
    // negative and must be dropped (MediaMuxer rejects negative presentation
    // times).
    val origin = TrimTimeline.originUs(startUs, videoKeyframeUs)
    val earlyAudioUs = 750_000L

    val rebased = TrimTimeline.rebase(earlyAudioUs, origin)

    assertTrue("sample before the origin rebases negative", rebased < 0L)
    assertTrue("negative-rebased samples are dropped", TrimTimeline.shouldDrop(rebased))
  }

  @Test
  fun `samples on or after the origin are kept`() {
    val origin = TrimTimeline.originUs(startUs, videoKeyframeUs)
    assertFalse(TrimTimeline.shouldDrop(TrimTimeline.rebase(origin, origin)))
    assertFalse(TrimTimeline.shouldDrop(TrimTimeline.rebase(origin + 1L, origin)))
  }

  @Test
  fun `extraction stops when the extractor is exhausted`() {
    // MediaExtractor.sampleTime returns -1 past the last sample.
    assertTrue(TrimTimeline.isPastEnd(-1L, 5_000_000L))
  }

  @Test
  fun `extraction stops once past the requested end`() {
    val endUs = 5_000_000L
    assertFalse(TrimTimeline.isPastEnd(endUs, endUs))
    assertTrue(TrimTimeline.isPastEnd(endUs + 1L, endUs))
  }
}
