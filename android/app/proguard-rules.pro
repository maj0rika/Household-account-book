# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve stack trace metadata and annotations required by Capacitor reflection
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod,JavascriptInterface

# App classes
-keep class com.maj0rika.household.** { *; }

# Capacitor 8 core and official plugins (e.g., SplashScreen)
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep @interface com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class androidx.core.splashscreen.** { *; }

# WebView JS bridge (@JavascriptInterface)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**
