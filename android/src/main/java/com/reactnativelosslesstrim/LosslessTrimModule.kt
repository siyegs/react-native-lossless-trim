package com.reactnativelosslesstrim

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo module surface for the Android passthrough trimmer. Kept thin: all of
 * the work lives in [PassthroughTrimmer] and [TrimTimeline]. The JS name
 * "LosslessTrim" must match `expo-module.config.json` and the iOS `Name(...)`.
 */
class LosslessTrimModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LosslessTrim")

    AsyncFunction("trimVideo") { uri: String, startMs: Double, endMs: Double, promise: Promise ->
      try {
        val context = appContext.reactContext
          ?: throw IllegalStateException("No React context available")
        promise.resolve(PassthroughTrimmer.trim(context, uri, startMs, endMs))
      } catch (e: Exception) {
        promise.reject("ERR_TRIM", e.message ?: "The video could not be trimmed.", e)
      }
    }
  }
}
