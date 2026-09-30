package com.example.server.reservation.payment.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class RefundReceiveAccount(
  @field:NotBlank
  @field:Size(max = 20)
  val bank: String,

  @field:Pattern(regexp = "^[0-9]{1,20}$")
  val accountNumber: String,

  @field:NotBlank
  @field:Size(max = 60)
  val holderName: String,
)
