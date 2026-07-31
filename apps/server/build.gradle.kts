plugins {
  kotlin("jvm") version "2.3.21"
  kotlin("plugin.spring") version "2.3.21"
  id("org.springframework.boot") version "4.1.0"
  id("io.spring.dependency-management") version "1.1.7"
  id("org.jlleitschuh.gradle.ktlint") version "14.2.0"
  kotlin("plugin.jpa") version "2.3.21"
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
  implementation("org.jetbrains.kotlin:kotlin-reflect")
  implementation("tools.jackson.module:jackson-module-kotlin")
  implementation("io.github.cdimascio:dotenv-kotlin:6.5.1")
  implementation("org.springframework.boot:spring-boot-starter-data-redis")
  implementation("org.apache.commons:commons-pool2")
  implementation("org.springframework.boot:spring-boot-starter-actuator")
  implementation("org.flywaydb:flyway-core")
  implementation("org.flywaydb:flyway-mysql")
  implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.3")
  implementation("io.jsonwebtoken:jjwt-api:0.12.6")
  implementation("org.springframework.boot:spring-boot-starter-security")
  runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
  runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
  runtimeOnly("com.mysql:mysql-connector-j")
  runtimeOnly("io.netty:netty-resolver-dns-native-macos:4.2.15.Final:osx-aarch_64")
  testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
  testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
  testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
  testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
  testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
  compilerOptions {
    freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
  }
}

allOpen {
  annotation("jakarta.persistence.Entity")
  annotation("jakarta.persistence.MappedSuperclass")
  annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
  useJUnitPlatform()
}
