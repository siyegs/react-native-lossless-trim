package com.reactnativelosslesstrim

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import java.io.File
import java.nio.ByteBuffer

/**
 * Passthrough (no re-encode) video trim. Copies the encoded samples in the
 * requested time range from the source into a fresh mp4 with MediaExtractor +
 * MediaMuxer, so it is fast and lossless.
 *
 * All timing decisions (shared origin, rebasing, keep/drop) are delegated to
 * [TrimTimeline] so the A/V-sync logic stays unit-testable on the JVM.
 */
object PassthroughTrimmer {

  /**
   * Trim [`startMs`, `endMs`] out of `uri` and return a `file://` uri to the
   * output written in the app cache directory.
   *
   * @throws IllegalStateException on unreadable sources or missing tracks.
   */
  fun trim(context: Context, uri: String, startMs: Double, endMs: Double): String {
    var extractor: MediaExtractor? = null
    var muxer: MediaMuxer? = null
    try {
      extractor = MediaExtractor()
      if (uri.startsWith("content://")) {
        val pfd = context.contentResolver.openFileDescriptor(Uri.parse(uri), "r")
          ?: throw IllegalStateException("Cannot open the source video")
        pfd.use { extractor.setDataSource(it.fileDescriptor) }
      } else {
        extractor.setDataSource(uri.removePrefix("file://"))
      }

      val outFile = File(context.cacheDir, "lossless_trim_${System.currentTimeMillis()}.mp4")
      muxer = MediaMuxer(outFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

      // Map every audio/video source track to a muxer track, and carry over the
      // video rotation so the trimmed clip keeps its orientation.
      val indexMap = HashMap<Int, Int>()
      var maxInputSize = 0
      var orientationHint = 0
      for (i in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("video/") || mime.startsWith("audio/")) {
          indexMap[i] = muxer.addTrack(format)
          if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
            maxInputSize = maxOf(maxInputSize, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE))
          }
          if (mime.startsWith("video/") && format.containsKey(MediaFormat.KEY_ROTATION)) {
            orientationHint = format.getInteger(MediaFormat.KEY_ROTATION)
          }
        }
      }
      if (indexMap.isEmpty()) throw IllegalStateException("No audio or video tracks found")
      if (maxInputSize <= 0) maxInputSize = 2 * 1024 * 1024
      muxer.setOrientationHint(orientationHint)

      val startUs = (startMs * 1000).toLong()
      val endUs = (endMs * 1000).toLong()

      // Find the nearest video sync frame at/before the requested start; that is
      // the shared origin both tracks rebase against (see TrimTimeline).
      var videoSyncUs: Long? = null
      for (srcTrack in indexMap.keys) {
        val mime = extractor.getTrackFormat(srcTrack).getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("video/")) {
          extractor.selectTrack(srcTrack)
          extractor.seekTo(startUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
          val syncUs = extractor.sampleTime
          if (videoSyncUs == null || (syncUs in 0 until videoSyncUs!!)) {
            videoSyncUs = syncUs
          }
          extractor.unselectTrack(srcTrack)
        }
      }
      val originUs = TrimTimeline.originUs(startUs, videoSyncUs)

      muxer.start()
      val buffer = ByteBuffer.allocate(maxInputSize)
      val info = MediaCodec.BufferInfo()

      for ((srcTrack, dstTrack) in indexMap) {
        extractor.selectTrack(srcTrack)
        extractor.seekTo(originUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
        while (true) {
          val presentationTimeUs = extractor.sampleTime
          if (TrimTimeline.isPastEnd(presentationTimeUs, endUs)) break
          val size = extractor.readSampleData(buffer, 0)
          if (size < 0) break
          // Rebase to the shared origin. Samples before it (a little audio that
          // precedes the video keyframe) are dropped so the first written
          // timestamp is >= 0 - MediaMuxer rejects negative presentation times.
          val rebasedUs = TrimTimeline.rebase(presentationTimeUs, originUs)
          if (TrimTimeline.shouldDrop(rebasedUs)) {
            extractor.advance()
            continue
          }
          info.offset = 0
          info.size = size
          info.presentationTimeUs = rebasedUs
          info.flags = if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) {
            MediaCodec.BUFFER_FLAG_KEY_FRAME
          } else {
            0
          }
          muxer.writeSampleData(dstTrack, buffer, info)
          extractor.advance()
        }
        extractor.unselectTrack(srcTrack)
      }

      muxer.stop()
      return Uri.fromFile(outFile).toString()
    } finally {
      try { muxer?.release() } catch (_: Exception) {}
      try { extractor?.release() } catch (_: Exception) {}
    }
  }
}
