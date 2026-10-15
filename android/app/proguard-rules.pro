# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep line numbers so Play Console / crash reports stay readable, but still
# obfuscate the original source file names. AGP uploads mapping.txt with the AAB.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ---------------------------------------------------------------------------
# Capacitor
# ---------------------------------------------------------------------------
# @capacitor/android ships consumer rules that keep Plugin subclasses and
# @CapacitorPlugin members. The bridge itself is also reached reflectively and
# over @JavascriptInterface, so keep it wholesale.
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Plugin classes are instantiated by name from assets/capacitor.plugins.json.
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }

# Anything exposed to the WebView.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---------------------------------------------------------------------------
# App code reached only from the manifest / system
# ---------------------------------------------------------------------------
# AAPT generates keep rules for manifest-declared components, but the widget
# RemoteViews stack is also referenced from XML resources and PendingIntents.
-keep class com.donetick.app.MainActivity { *; }
-keep class com.donetick.app.widget.** { *; }

# ---------------------------------------------------------------------------
# Third-party plugins that use JNI / codegen / reflection
# ---------------------------------------------------------------------------
# @capacitor-community/sqlite -> sqlcipher-android (JNI)
-keep class net.sqlcipher.** { *; }
-keep class net.zetetic.** { *; }
-dontwarn net.sqlcipher.**
-dontwarn net.zetetic.**

# Room generated implementations are looked up by name.
-keep class * extends androidx.room.RoomDatabase { *; }
-dontwarn androidx.room.paging.**

# ML Kit (OCR, document scanner, genai-prompt) loads models via reflection.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-dontwarn com.google.mlkit.**

# RevenueCat
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# Any remaining JNI entry points.
-keepclasseswithmembernames class * {
    native <methods>;
}
