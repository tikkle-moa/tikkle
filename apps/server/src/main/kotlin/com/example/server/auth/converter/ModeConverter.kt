package com.example.server.auth.converter

import com.example.server.auth.types.Mode
import org.springframework.core.convert.converter.Converter
import org.springframework.stereotype.Component

@Component
class ModeConverter : Converter<String, Mode> {
  override fun convert(source: String): Mode = Mode.entries.find { it.value == source }
    ?: throw IllegalArgumentException()
}
