package com.example.server

import io.github.cdimascio.dotenv.dotenv
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@EnableScheduling
@SpringBootApplication
class ServerApplication

fun main(args: Array<String>) {
  if (System.getenv("LOAD_DOTENV") != "false") {
    val dotenv = dotenv { ignoreIfMissing = true }

    dotenv.entries().forEach { System.setProperty(it.key, it.value) }
  }

  runApplication<ServerApplication>(*args)
}
