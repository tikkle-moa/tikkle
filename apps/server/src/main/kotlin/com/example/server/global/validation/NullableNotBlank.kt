package com.example.server.global.validation

import jakarta.validation.Constraint
import jakarta.validation.Payload
import kotlin.reflect.KClass

@Target(
  AnnotationTarget.FIELD,
  AnnotationTarget.PROPERTY_GETTER,
  AnnotationTarget.VALUE_PARAMETER,
)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [NullableNotBlankStringValidator::class, NullableNotBlankJsonNullableValidator::class])
annotation class NullableNotBlank(
  val message: String = "빈 문자열이 될 수 없습니다.",
  val required: Boolean = false,
  val groups: Array<KClass<*>> = [],
  val payload: Array<KClass<out Payload>> = [],
)
