// android/build.gradle.kts (nivel proyecto)


// android/build.gradle.kts

import org.gradle.api.tasks.Delete

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.buildDir)
}
