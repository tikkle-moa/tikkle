package com.example.server.global.openapi

import com.example.server.global.exception.ErrorCode

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class ErrorResponse(val responses: Array<ErrorResponseItem>)

annotation class ErrorResponseItem(val errorCode: ErrorCode, val description: String = "")
