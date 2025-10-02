// android/build.gradle.kts (nivel proyecto)


import org.gradle.api.tasks.Delete

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val rootBuildDir = layout.buildDirectory.dir("../../build")
layout.buildDirectory.set(rootBuildDir)

subprojects {
    layout.buildDirectory.set(rootBuildDir.map { it.dir(project.name) })
}

tasks.register<Delete>("clean") {
    delete(layout.buildDirectory.get().asFile)
}
