package com.example.server.global.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import org.openapitools.jackson.nullable.JsonNullable

class NullableNotBlankJsonNullableValidator : ConstraintValidator<NullableNotBlank, JsonNullable<String?>> {

  private var required = false

  override fun initialize(annotation: NullableNotBlank) {
    required = annotation.required
  }

  override fun isValid(value: JsonNullable<String?>?, context: ConstraintValidatorContext): Boolean {
    if (value == null || !value.isPresent) {
      return !required
    }

    return value.get()?.isNotBlank() ?: true
  }
}
