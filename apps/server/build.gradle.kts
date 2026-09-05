plugins {
  kotlin("jvm") version "2.3.21"
  kotlin("plugin.spring") version "2.3.21"
  kotlin("plugin.jpa") version "2.3.21"

  id("org.springframework.boot") version "4.1.0"
  id("io.spring.dependency-management") version "1.1.7"
  id("org.jlleitschuh.gradle.ktlint") version "14.2.0"

  jacoco
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(21)
  }
}

repositories {
  mavenCentral()
}

dependencies {
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
  implementation("org.springframework.boot:spring-boot-starter-validation")
  implementation("org.springframework.boot:spring-boot-starter-webmvc")
  implementation("org.springframework.boot:spring-boot-restclient")
  implementation("org.jetbrains.kotlin:kotlin-reflect")
  implementation("tools.jackson.module:jackson-module-kotlin")
  implementation("io.github.cdimascio:dotenv-kotlin:6.5.1")
  implementation("org.springframework.boot:spring-boot-starter-data-redis")
  implementation("org.apache.commons:commons-pool2")
  implementation("org.springframework.boot:spring-boot-starter-actuator")
  implementation("org.flywaydb:flyway-core")
  implementation("org.flywaydb:flyway-mysql")
  implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.3")
  implementation("org.openapitools:jackson-databind-nullable:0.2.11")
  implementation("io.jsonwebtoken:jjwt-api:0.12.6")
  implementation("org.springframework.boot:spring-boot-starter-security")
  implementation("org.springframework.boot:spring-boot-starter-websocket")
  implementation("io.github.springwolf:springwolf-stomp:2.6.0")
  runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
  runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
  runtimeOnly("com.mysql:mysql-connector-j")
  runtimeOnly("io.netty:netty-resolver-dns-native-macos:4.2.15.Final:osx-aarch_64")
  testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
  testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
  testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
  testImplementation("org.springframework.boot:spring-boot-starter-test")
  testImplementation("org.springframework.security:spring-security-test")
  testImplementation("org.springframework.boot:spring-boot-restclient-test")
  testImplementation("org.springframework.boot:spring-boot-testcontainers")
  testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
  testImplementation("org.testcontainers:testcontainers-junit-jupiter")
  testImplementation("org.testcontainers:testcontainers-mysql")
  testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
  testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
  compilerOptions {
    freeCompilerArgs.addAll(
      "-Xjsr305=strict",
      "-Xannotation-default-target=param-property",
      "-Xemit-jvm-type-annotations",
    )
  }
}

allOpen {
  annotation("jakarta.persistence.Entity")
  annotation("jakarta.persistence.MappedSuperclass")
  annotation("jakarta.persistence.Embeddable")
}

jacoco {
  toolVersion = "0.8.14"
}

tasks.withType<Test> {
  useJUnitPlatform()

  jvmArgs("-Xshare:off")

  testLogging {
    events = emptySet()
  }

  addTestListener(
    object : TestListener {
      private val green = "\u001B[32m"
      private val red = "\u001B[31m"
      private val yellow = "\u001B[33m"
      private val cyan = "\u001B[36m"
      private val reset = "\u001B[0m"

      private var passed = 0L
      private var failed = 0L
      private var skipped = 0L

      override fun beforeSuite(suite: TestDescriptor) {
        if (shouldDisplaySuite(suite)) {
          println("${indent(suite)}${cyan}${suite.displayName}$reset")
        }
      }

      override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {
        val status = when (result.resultType) {
          TestResult.ResultType.SUCCESS -> {
            passed++
            "$green✓$reset"
          }
          TestResult.ResultType.FAILURE -> {
            failed++
            "$red✘$reset"
          }
          TestResult.ResultType.SKIPPED -> {
            skipped++
            "$yellow○$reset"
          }
        }

        val durationMs = result.endTime - result.startTime

        println("${indent(testDescriptor)}$status ${testDescriptor.displayName} ${yellow}${durationMs}ms$reset")

        if (result.resultType == TestResult.ResultType.FAILURE) {
          result.exceptions.forEach { exception ->
            println("${indent(testDescriptor)}  ${red}${exception.message}$reset")
          }
        }
      }

      override fun afterSuite(suite: TestDescriptor, result: TestResult) {
        if (suite.parent == null) {
          val total = passed + failed + skipped
          val durationMs = result.endTime - result.startTime

          println()
          println("${cyan}Test summary$reset")
          println("---------------------------")
          println("Tests   : $total")
          println("${green}Passed  : $passed$reset")
          println("${red}Failed  : $failed$reset")
          println("${yellow}Skipped : $skipped$reset")
          println("Duration : ${durationMs}ms")
          println("---------------------------")
        }
      }

      override fun beforeTest(testDescriptor: TestDescriptor) = Unit

      private fun shouldDisplaySuite(descriptor: TestDescriptor): Boolean {
        if (descriptor.parent == null) {
          return false
        }

        val name = descriptor.name

        return name != "Gradle Test Executor 1" &&
          name != "Gradle Test Run :test" &&
          !name.startsWith("Gradle Test Executor")
      }

      private fun indent(descriptor: TestDescriptor): String {
        var depth = 0
        var parent = descriptor.parent
        while (parent != null) {
          if (shouldDisplaySuite(parent)) {
            depth++
          }
          parent = parent.parent
        }
        return "  ".repeat(depth)
      }
    },
  )

  finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
  dependsOn(tasks.test)

  classDirectories.setFrom(
    files(
      classDirectories.files.map {
        fileTree(it) {
          include(
            "**/*Controller*",
            "**/*Service*",
            "**/*Provider*",
            "**/*Handler*",
            "**/*EntryPoint*",
            "**/*Interceptor*",
          )
          exclude(
            "**/dto/**",
            "**/converter/**",
            "**/entity/**",
            "**/types/**",
            "**/config/***",
          )
        }
      },
    ),
  )

  reports {
    html.required.set(true)
    csv.required.set(true)
  }

  doLast {
    val csvFile = reports.csv.outputLocation.get().asFile
    val lines = csvFile.readLines().drop(1)

    val values = lines
      .map { it.split(",") }
      .filter { it.size >= 13 }

    val instructionMissed = values.sumOf { it[3].toLong() }
    val instructionCovered = values.sumOf { it[4].toLong() }
    val branchMissed = values.sumOf { it[5].toLong() }
    val branchCovered = values.sumOf { it[6].toLong() }
    val lineMissed = values.sumOf { it[7].toLong() }
    val lineCovered = values.sumOf { it[8].toLong() }
    val complexityMissed = values.sumOf { it[9].toLong() }
    val complexityCovered = values.sumOf { it[10].toLong() }
    val methodMissed = values.sumOf { it[11].toLong() }
    val methodCovered = values.sumOf { it[12].toLong() }

    fun percentageValue(covered: Long, missed: Long): Double {
      val total = covered + missed
      return if (total == 0L) 100.0 else covered * 100.0 / total
    }

    fun coloredPercentage(covered: Long, missed: Long): String {
      val value = percentageValue(covered, missed)

      val color = when {
        value >= 80.0 -> "\u001B[32m" // 초록
        value >= 60.0 -> "\u001B[33m" // 노랑
        else -> "\u001B[31m" // 빨강
      }

      return "$color${"%.2f".format(value)}%\u001B[0m"
    }

    val cyan = "\u001B[36m"
    val reset = "\u001B[0m"

    println()
    println("${cyan}Coverage summary$reset")
    println("---------------------------")
    println("Instructions : ${coloredPercentage(instructionCovered, instructionMissed)}")
    println("Branches     : ${coloredPercentage(branchCovered, branchMissed)}")
    println("Lines        : ${coloredPercentage(lineCovered, lineMissed)}")
    println("Complexity   : ${coloredPercentage(complexityCovered, complexityMissed)}")
    println("Methods      : ${coloredPercentage(methodCovered, methodMissed)}")
    println("---------------------------")
    println("${cyan}HTML url$reset: file://${reports.html.outputLocation.get().asFile.absolutePath}/index.html")
    println("---------------------------")
  }
}
