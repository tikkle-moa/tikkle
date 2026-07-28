package com.example.server.auth.converter

import com.example.server.auth.types.OAuthProvider
import org.springframework.core.convert.converter.Converter
import org.springframework.stereotype.Component

@Component
class OAuthProviderConverter : Converter<String, OAuthProvider> {
  override fun convert(source: String): OAuthProvider = OAuthProvider.entries.find { it.value == source }
    ?: throw IllegalArgumentException()
}
