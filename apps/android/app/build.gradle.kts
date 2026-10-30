plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val allowStub = (project.findProperty("salomonAllowAskStub") as String?)?.toBoolean() ?: false

android {
    namespace = "ai.salomon.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "ai.salomon.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.0.1-m-a0"
        ndk { abiFilters += listOf("arm64-v8a") }
    }
    buildTypes {
        debug { buildConfigField("boolean", "SALOMON_ALLOW_ASK_STUB", allowStub.toString()) }
        release {
            isMinifyEnabled = false
            buildConfigField("boolean", "SALOMON_ALLOW_ASK_STUB", "false")
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    val bom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(bom)
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
