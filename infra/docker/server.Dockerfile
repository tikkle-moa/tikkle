FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY apps/server/gradlew ./
COPY apps/server/gradle ./gradle
COPY apps/server/build.gradle.kts apps/server/settings.gradle.kts ./

RUN chmod +x gradlew

COPY apps/server/src ./src

EXPOSE 8080

CMD ["./gradlew", "bootRun", "--no-daemon"]