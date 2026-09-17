package com.margelo.nitro.rndocumentscanner

import androidx.annotation.Keep

@Keep
class HybridDocumentScanner : HybridDocumentScannerSpec() {
  override fun getNativeVersion(): String {
    return "0.1.0-android"
  }

  override fun ping(message: String): String {
    return "Android Pong: $message"
  }
}
