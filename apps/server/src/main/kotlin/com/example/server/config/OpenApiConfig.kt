package com.example.server.config

import com.example.server.auth.types.OAuthErrorCode
import com.example.server.global.response.ApiResponse
import io.swagger.v3.core.converter.ModelConverters
import io.swagger.v3.core.jackson.ModelResolver
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType
import io.swagger.v3.oas.annotations.security.SecurityScheme
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.media.Schema
import io.swagger.v3.oas.models.media.StringSchema
import org.springdoc.core.customizers.OpenApiCustomizer
import org.springdoc.core.customizers.OperationCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

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

  @Bean
  fun openApi(): OpenAPI = OpenAPI().info(
    Info()
      .title("Tikkle API")
      .description("Tikkle 콘서트 예매 서비스 API 문서입니다.")
      .version("v1"),
  )

  @Bean
  fun apiResponseSchemaCustomizer(): OpenApiCustomizer = OpenApiCustomizer { openApi ->
    val schemas = ModelConverters.getInstance()
      .readAll(ApiResponse.Failure::class.java)

    schemas.forEach { (name, schema) ->
      openApi.components.addSchemas(name, schema)
    }
  }

  @Bean
  fun emptySuccessSchemaCustomizer(): OpenApiCustomizer {
    return OpenApiCustomizer { openApi ->
      val schema = openApi.components.schemas["EmptySuccess"]
        ?: return@OpenApiCustomizer

      schema.properties["data"] = Schema<Any>().apply {
        type = "string"
        nullable = true
        addEnumItemObject(null)
      }

      schema.required = listOf("success", "data")
    }
  }

  @Bean
  fun apiResponseMediaTypeCustomizer(): OperationCustomizer {
    return OperationCustomizer { operation, _ ->
      operation.responses.values.forEach { response ->
        val content = response.content ?: return@forEach

        val mediaType = content.remove("*/*")
          ?: return@forEach

        content.addMediaType(
          "application/json",
          mediaType,
        )
      }

      operation
    }
  }

  @Bean
  fun oauthErrorCodeSchemaCustomizer(): OpenApiCustomizer = OpenApiCustomizer { openApi ->
    openApi.components.addSchemas(
      "OAuthErrorCode",
      StringSchema()._enum(OAuthErrorCode.entries.map { it.name }),
    )
  }
}
