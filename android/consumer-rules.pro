# Giữ lại các class Nitro Modules và JNI C++ bindings để tránh crash khi app bật R8 / Minify
-keep class com.margelo.nitro.rndocumentscanner.** { *; }
-keep class com.rndocumentscanner.** { *; }

# Giữ lại Google ML Kit Text Recognition
-keep class com.google.mlkit.vision.text.** { *; }
