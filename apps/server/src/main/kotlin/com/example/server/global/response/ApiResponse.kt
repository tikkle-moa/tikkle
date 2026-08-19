package com.example.server.global.response

import com.example.server.global.exception.ErrorCode
import io.swagger.v3.oas.annotations.media.Schema

sealed class ApiResponse<out T> {
  data class Success<out T>(
    @field:Schema(allowableValues = ["true"])
    val success: Boolean = true,

    val data: T,
  ) : ApiResponse<T>()

  data class EmptySuccess(
    @field:Schema(allowableValues = ["true"])
    val success: Boolean = true,

    val data: Nothing? = null,
  ) : ApiResponse<Nothing>()

  data class Failure(
    @field:Schema(allowableValues = ["false"], example = "false")
    val success: Boolean = false,

    val error: Error,
  ) : ApiResponse<Nothing>()

  data class Error(val code: Int, val message: String)

  companion object {
    fun <T> ok(data: T): Success<T> = Success(data = data)

    fun ok(): EmptySuccess = EmptySuccess()

    fun error(errorCode: ErrorCode): Failure = Failure(error = Error(code = errorCode.status.value(), message = errorCode.message))

    fun error(errorCode: ErrorCode, message: String): Failure = Failure(error = Error(code = errorCode.status.value(), message = message))
  }
}
