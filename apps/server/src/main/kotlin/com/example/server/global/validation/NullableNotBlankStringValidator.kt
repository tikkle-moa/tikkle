package com.example.server.global.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext

class NullableNotBlankStringValidator : ConstraintValidator<NullableNotBlank, String?> {

  private var required = false

  override fun initialize(annotation: NullableNotBlank) {
    required = annotation.required
  }

  override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
    if (value == null) {
      return !required
    }
    return value.isNotBlank()
  }
}
