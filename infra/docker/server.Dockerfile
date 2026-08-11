FROM eclipse-temurin:21-jdk

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY apps/server/gradlew ./
COPY apps/server/gradle ./gradle
COPY apps/server/build.gradle.kts apps/server/settings.gradle.kts ./

RUN chmod +x gradlew

COPY apps/server/src ./src

EXPOSE 8080

CMD ["./gradlew", "bootRun", "--no-daemon"]