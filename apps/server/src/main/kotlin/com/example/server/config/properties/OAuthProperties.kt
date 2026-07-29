package com.example.server.config.properties

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "oauth")
data class OAuthProperties(val providers: Map<String, ProviderConfig>) {
  data class ProviderConfig(val clientId: String, val clientSecret: String, val authorizationUri: String, val scope: String)
}
