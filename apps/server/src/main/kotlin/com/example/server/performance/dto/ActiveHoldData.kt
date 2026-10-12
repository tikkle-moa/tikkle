package com.example.server.performance.dto

import java.util.UUID

data class ActiveHoldData(
  val scopeId: String,
  val performanceId: Long,
  val holdScopeKey: String,
  val storedHoldDetailJsons: List<String>,
  val holdDetailKeys: List<String>,
  val holdDetails: List<VenueSeatHoldDetail>,
  val holdVenueSeatEntries: List<HoldVenueSeatEntry>,
)

data class HoldVenueSeatEntry(val key: String, val holdId: String, val venueSeatId: Long)

fun ActiveHoldData.reviewedBy(reviewToken: UUID): ActiveHoldData? {
  val selectedIndices = holdDetails.indices.filter { index ->
    holdDetails[index].phase == VenueSeatHoldDetail.VenueSeatHoldPhase.REVIEW &&
      holdDetails[index].reviewToken == reviewToken
  }
  return selected(selectedIndices)
}

fun ActiveHoldData.paymentFor(reservationId: Long): ActiveHoldData? {
  val selectedIndices = holdDetails.indices.filter { index ->
    holdDetails[index].phase == VenueSeatHoldDetail.VenueSeatHoldPhase.PAYMENT &&
      holdDetails[index].reservationId == reservationId
  }
  return selected(selectedIndices)
}

private fun ActiveHoldData.selected(selectedIndices: List<Int>): ActiveHoldData? {
  if (selectedIndices.isEmpty()) return null

  val selectedHoldIds = selectedIndices.map { holdDetails[it].holdId }.toSet()
  return copy(
    storedHoldDetailJsons = selectedIndices.map { storedHoldDetailJsons[it] },
    holdDetailKeys = selectedIndices.map { holdDetailKeys[it] },
    holdDetails = selectedIndices.map { holdDetails[it] },
    holdVenueSeatEntries = holdVenueSeatEntries.filter { it.holdId in selectedHoldIds },
  )
}
