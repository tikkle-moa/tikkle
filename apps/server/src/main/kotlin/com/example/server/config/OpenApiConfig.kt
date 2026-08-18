package com.example.server.config

import com.example.server.auth.types.OAuthErrorCode
import com.fasterxml.jackson.databind.JavaType
import com.fasterxml.jackson.databind.type.TypeFactory
import io.swagger.v3.core.converter.AnnotatedType
import io.swagger.v3.core.converter.ModelConverter
import io.swagger.v3.core.converter.ModelConverterContext
import io.swagger.v3.core.jackson.ModelResolver
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode
import io.swagger.v3.oas.annotations.security.SecurityScheme
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.SpecVersion
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.media.Schema
import io.swagger.v3.oas.models.media.StringSchema
import org.openapitools.jackson.nullable.JsonNullable
import org.openapitools.jackson.nullable.JsonNullableModule
import org.springdoc.core.customizers.OpenApiCustomizer
import org.springdoc.core.customizers.PropertyCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider
import org.springframework.context.annotation.Configuration
import org.springframework.core.type.filter.RegexPatternTypeFilter
import java.util.regex.Pattern
import kotlin.reflect.KClass
import kotlin.reflect.full.memberProperties
import io.swagger.v3.oas.annotations.media.Schema as SchemaAnnotation

@SecurityScheme(
  name = "access_token",
  type = SecuritySchemeType.APIKEY,
  `in` = SecuritySchemeIn.COOKIE,
  paramName = "access_token",
)
@Configuration
class OpenApiConfig {
  init {
    ModelResolver.enumsAsRef = true
  }

  private companion object {
    const val BASE_PACKAGE = "com.example.server"
  }

  private val schemaClasses by lazy { findSchemaClasses() }

  @Bean
  fun jsonNullableModule(): JsonNullableModule = JsonNullableModule()

  @Bean
  fun openApi(): OpenAPI = OpenAPI().info(
    Info()
      .title("Tikkle API")
      .description("Tikkle 콘서트 예매 서비스 API 문서입니다.")
      .version("v1"),
  )

  @Bean
  fun oauthErrorCodeSchemaCustomizer(): OpenApiCustomizer = OpenApiCustomizer { openApi ->
    openApi.components.addSchemas(
      "OAuthErrorCode",
      StringSchema()._enum(OAuthErrorCode.entries.map { it.name }),
    )
  }

  @Bean
  fun jsonNullableModelConverter(): ModelConverter {
    return object : ModelConverter {
      override fun resolve(type: AnnotatedType, context: ModelConverterContext, chain: MutableIterator<ModelConverter>): Schema<*>? {
        val javaType = when (val rawType = type.type) {
          is JavaType -> rawType
          null -> return next(type, context, chain)
          else -> TypeFactory.defaultInstance().constructType(rawType)
        }

        if (!JsonNullable::class.java.isAssignableFrom(javaType.rawClass)) {
          return next(type, context, chain)
        }

        val innerType = javaType.containedType(0)
          ?: return next(type, context, chain)

        return context.resolve(
          AnnotatedType(innerType)
            .jsonViewAnnotation(type.jsonViewAnnotation)
            .ctxAnnotations(type.ctxAnnotations),
        )
      }

      private fun next(type: AnnotatedType, context: ModelConverterContext, chain: MutableIterator<ModelConverter>): Schema<*>? =
        if (chain.hasNext()) {
          chain.next().resolve(type, context, chain)
        } else {
          null
        }
    }
  }

  @Bean
  fun optionalPropertyCustomizer(): PropertyCustomizer = PropertyCustomizer { propertySchema, annotatedType ->
    val isNotRequired = annotatedType.ctxAnnotations
      ?.filterIsInstance<SchemaAnnotation>()
      ?.any { it.requiredMode == RequiredMode.NOT_REQUIRED }
      ?: false

    if (isNotRequired) {
      propertySchema.addExtension("x-not-required", true)
    }

    propertySchema
  }

  @Bean
  fun defaultRequiredOpenApiCustomizer(): OpenApiCustomizer {
    return OpenApiCustomizer { openApi ->
      openApi.components?.schemas?.forEach { (schemaName, schema) ->
        val properties = schema.properties ?: return@forEach

        schema.required = properties
          .filter { (propertyName, propertySchema) ->
            propertySchema.extensions?.get("x-not-required") != true &&
              !isJsonNullableProperty(schemaName, propertyName)
          }
          .keys
          .toMutableList()
          .takeIf { it.isNotEmpty() }

        properties.values.forEach { property ->
          property.extensions?.remove("x-not-required")
        }
      }
    }
  }

  private fun findSchemaProperty(schemaName: String, propertyName: String) = schemaClasses[schemaName]
    ?.memberProperties
    ?.firstOrNull { it.name == propertyName }

  private fun isJsonNullableProperty(schemaName: String, propertyName: String): Boolean = findSchemaProperty(schemaName, propertyName)
    ?.returnType
    ?.classifier == JsonNullable::class

  @Bean
  fun jsonNullableSchemaCustomizer(): OpenApiCustomizer {
    return OpenApiCustomizer { openApi ->
      val schemas = openApi.components?.schemas ?: return@OpenApiCustomizer

      schemas.forEach { (schemaName, schema) ->
        val properties = schema.properties ?: return@forEach

        properties.forEach { (propertyName, propertySchema) ->
          val kotlinProperty = findSchemaProperty(schemaName, propertyName)
            ?: return@forEach

          if (kotlinProperty.returnType.classifier != JsonNullable::class) {
            return@forEach
          }

          val valueType = kotlinProperty.returnType.arguments
            .firstOrNull()
            ?.type
            ?: return@forEach

          if (valueType.isMarkedNullable) {
            markNullable(
              propertyName = propertyName,
              propertySchema = propertySchema,
              properties = properties,
              specVersion = schema.specVersion ?: SpecVersion.V30,
            )
          }
        }
      }
    }
  }

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

  private fun markNullable(propertyName: String, propertySchema: Schema<*>, properties: MutableMap<String, Schema<Any>>, specVersion: SpecVersion) {
    if (propertySchema.`$ref` != null) {
      properties[propertyName] =
        wrapRefNullable(propertySchema.`$ref`, specVersion)

      return
    }

    if (specVersion == SpecVersion.V31) {
      val currentTypes = propertySchema.types
        ?: propertySchema.type?.let { setOf(it) }
        ?: emptySet()

      if ("null" !in currentTypes) {
        propertySchema.types = currentTypes + "null"
      }

      return
    }

    propertySchema.nullable = true
  }

  private fun wrapRefNullable(ref: String, specVersion: SpecVersion): Schema<Any> {
    val refSchema = Schema<Any>().apply {
      `$ref` = ref
    }

    if (specVersion == SpecVersion.V31) {
      return Schema<Any>().apply {
        oneOf = listOf(
          refSchema,
          Schema<Any>().apply {
            addType("null")
          },
        )
      }
    }

    return Schema<Any>().apply {
      nullable = true
      allOf = listOf(refSchema)
    }
  }
}
