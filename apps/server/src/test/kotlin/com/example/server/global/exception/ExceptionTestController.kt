package com.example.server.global.exception

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/test/exception")
class ExceptionTestController(private val exceptionTestService: ExceptionTestService) {

  @GetMapping("/handler-method-validation")
  fun throwHandlerMethodValidationException(
    @RequestParam
    @Min(value = 1, message = "page는 1 이상이어야 합니다.")
    page: Int,
  ): String = page.toString()

  @GetMapping("/constraint-violation")
  fun throwConstraintViolationException(@RequestParam page: Int): String = exceptionTestService.validatePage(page).toString()

  @GetMapping("/custom")
  fun throwCustom(): String = throw CustomException(ErrorCode.NOT_FOUND)

  @PostMapping("/valid", consumes = [MediaType.APPLICATION_JSON_VALUE])
  fun requireValid(@Valid @RequestBody body: ValidBody): String = body.name

  @GetMapping("/missing-param")
  fun requireParam(@RequestParam requiredParam: String): String = requiredParam

  @GetMapping("/type-mismatch/{id}")
  fun requireIntId(@PathVariable id: Int): String = id.toString()

  @PostMapping("/json-parse", consumes = [MediaType.APPLICATION_JSON_VALUE])
  fun parseJson(@RequestBody body: Map<String, Any>): String = "ok"

  @GetMapping("/data-integrity")
  fun throwDataIntegrity(): String = throw DataIntegrityViolationException("중복 키 위반")

  @GetMapping("/server-error")
  fun throwUnhandled(): String = throw RuntimeException("미처리 예외")

  data class ValidBody(@field:NotBlank val name: String = "")
}
