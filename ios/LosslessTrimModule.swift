import ExpoModulesCore
import AVFoundation

// Passthrough (no re-encode) video trim. Copies the encoded frames in the
// requested time range into a fresh mp4 via AVAssetExportSession, so it is fast
// and lossless. AVAssetExportSession writes an edit list, so the cut is
// frame-precise and audio/video stay in sync with no extra work (unlike the
// Android path, which is keyframe-bound - see the README).
public class LosslessTrimModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LosslessTrim")

    AsyncFunction("trimVideo") { (uri: String, startMs: Double, endMs: Double, promise: Promise) in
      let srcURL: URL = uri.hasPrefix("file://")
        ? (URL(string: uri) ?? URL(fileURLWithPath: uri))
        : URL(fileURLWithPath: uri)

      let asset = AVURLAsset(url: srcURL)

      guard let export = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetPassthrough
      ) else {
        promise.reject("ERR_TRIM", "Could not create an export session for this video.")
        return
      }

      let outURL = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent("lossless_trim_\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
      try? FileManager.default.removeItem(at: outURL)

      let start = CMTime(value: Int64(startMs), timescale: 1000)
      let end = CMTime(value: Int64(endMs), timescale: 1000)
      export.timeRange = CMTimeRange(start: start, end: end)
      export.outputURL = outURL
      export.outputFileType = .mp4
      export.shouldOptimizeForNetworkUse = true

      export.exportAsynchronously {
        if export.status == .completed {
          promise.resolve(outURL.absoluteString)
        } else {
          promise.reject(
            "ERR_TRIM",
            export.error?.localizedDescription ?? "The video could not be trimmed."
          )
        }
      }
    }
  }
}
