package com.example.server.config

import io.github.springwolf.core.asyncapi.components.postprocessors.SchemasPostProcessor
import io.swagger.v3.oas.models.media.Schema
import org.openapitools.jackson.nullable.JsonNullable
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider
import org.springframework.context.annotation.Configuration
import org.springframework.core.type.filter.RegexPatternTypeFilter
import java.util.regex.Pattern
import kotlin.reflect.KClass
import kotlin.reflect.full.memberProperties

@Configuration(proxyBeanMethods = false)
class AsyncApiConfig {
  private companion object {
    const val BASE_PACKAGE = "com.example.server"
  }

  private val schemaClasses by lazy { findSchemaClasses() }

  private fun findSchemaClasses(): Map<String, KClass<*>> {
    val scanner = ClassPathScanningCandidateComponentProvider(false).apply {
      addIncludeFilter(
        RegexPatternTypeFilter(Pattern.compile(".*")),
      )
    }

    return scanner.findCandidateComponents(BASE_PACKAGE)
      .mapNotNull { candidate ->
        runCatching {
          Class.forName(candidate.beanClassName).kotlin
        }.getOrNull()
      }
      .associateBy { it.simpleName.orEmpty() }
      .filterKeys(String::isNotBlank)
  }

  @Bean
  fun springwolfSchemaPostProcessor(): SchemasPostProcessor = SchemasPostProcessor { schema, _, _ ->
    val schemaName = schema.name ?: schema.title ?: return@SchemasPostProcessor

    if (schemaName.startsWith("StompSuccessMessage") && schemaName != "StompSuccessMessage") {
      schema.title = schemaName
    }

    if (schemaName.startsWith("StompSuccessMessage")) {
      schema.required = listOf("requestId", "success", "data")
    }

    val properties = schema.properties ?: return@SchemasPostProcessor
    val requiredProperties = properties.keys
      .filter { propertyName ->
        findSchemaProperty(schemaName, propertyName)
          ?.let { it.returnType.classifier != JsonNullable::class }
          ?: false
      }

    schema.required = requiredProperties.takeIf { it.isNotEmpty() }

    properties.forEach { (propertyName, propertySchema) ->
      val kotlinProperty = findSchemaProperty(schemaName, propertyName)
        ?: return@forEach

      val isNullable =
        kotlinProperty.returnType.isMarkedNullable ||
          (
            kotlinProperty.returnType.classifier == JsonNullable::class &&
              kotlinProperty.returnType.arguments.firstOrNull()?.type?.isMarkedNullable == true
            )

      if (isNullable) {
        markNullable(propertyName, propertySchema, properties)
      }
    }
  }

  private fun findSchemaProperty(schemaName: String, propertyName: String) = schemaClasses[schemaName]
    ?.memberProperties
    ?.firstOrNull { it.name == propertyName }

  private fun markNullable(propertyName: String, propertySchema: Schema<*>, properties: MutableMap<String, Schema<Any>>) {
    if (propertySchema.`$ref` != null) {
      properties[propertyName] = Schema<Any>().apply {
        oneOf = listOf(
          Schema<Any>().apply {
            `$ref` = propertySchema.`$ref`
          },
          Schema<Any>().apply {
            addType("null")
          },
        )
      }

      return
    }

    val currentTypes = propertySchema.types
      ?: propertySchema.type?.let { setOf(it) }
      ?: emptySet()

    if ("null" !in currentTypes) {
      propertySchema.types = currentTypes + "null"
    }
  }
}
