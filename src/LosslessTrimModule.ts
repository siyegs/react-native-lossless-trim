import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * The raw native binding. Kept intentionally thin: the public {@link trimAsync}
 * wrapper in `index.ts` owns validation and the friendlier options/result API.
 */
export interface LosslessTrimNativeModule {
  /**
   * Passthrough-trim [`startMs`, `endMs`] out of `uri` and resolve with a uri
   * to the output file. Positional to keep the native bridge surface minimal.
   */
  trimVideo(uri: string, startMs: number, endMs: number): Promise<string>;
}

/**
 * Optional lookup so a missing or unregistered native module resolves to `null`
 * instead of throwing at import time. `isAvailable()` reflects this.
 */
export default requireOptionalNativeModule<LosslessTrimNativeModule>(
  "LosslessTrim",
);
