plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")        // <- este es el id correcto en KTS
    // El plugin de Flutter debe ir después de Android y Kotlin.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.frontend_pos"

    // Estos valores los expone el plugin de Flutter.
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    // Recomendado con AGP 8.x: Java 17
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.example.frontend_pos"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Firma de debug solo para poder ejecutar `flutter run --release`
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
