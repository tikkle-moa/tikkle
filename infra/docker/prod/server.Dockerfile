FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

COPY apps/server/gradlew ./
COPY apps/server/gradle ./gradle
COPY apps/server/build.gradle.kts apps/server/settings.gradle.kts ./

RUN chmod +x gradlew

COPY apps/server/src ./src

RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system app \
  && useradd --system --gid app app

COPY --from=build --chown=app:app /app/build/libs/server.jar ./server.jar

USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/server.jar"]
