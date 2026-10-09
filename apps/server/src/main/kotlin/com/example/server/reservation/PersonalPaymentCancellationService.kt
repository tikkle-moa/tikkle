package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.types.VenueSeatHoldRedisDefinitions
import com.example.server.performance.types.VenueSeatHoldScope
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class PersonalPaymentCancellationService(
  private val reservationRepository: ReservationRepository,
  private val stringRedisTemplate: StringRedisTemplate,
) {
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  fun cancelPersonalPaymentPending(scopeId: String, userId: Long, performanceId: Long) {
    if (!VenueSeatHoldScope.isPersonal(scopeId)) return

    reservationRepository.findPaymentInProgressByScopeForUpdate(
      groupId = null,
      bookerUserId = userId,
      performanceId = performanceId,
      statuses = listOf(ReservationStatus.PAYMENT_PENDING),
    )?.let { reservation ->
      reservation.status = if (reservation.paymentExpiresAt.isAfter(LocalDateTime.now())) {
        ReservationStatus.CANCELLED
      } else {
        ReservationStatus.EXPIRED
      }

      stringRedisTemplate.execute(
        VenueSeatHoldRedisDefinitions.supersedePaymentHoldsScript,
        listOf(VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId), VenueSeatHoldRedisDefinitions.versionKey(performanceId)),
        VenueSeatHoldRedisDefinitions.HOLD_DETAIL_KEY_PREFIX,
        scopeId,
        reservation.id.toString(),
      ) ?: throw CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "기존 결제 좌석 점유 정보를 갱신하지 못했습니다.")
    }
  }
}
