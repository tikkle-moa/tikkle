package com.example.server.performance.dto

data class ActiveHoldData(
  val groupId: String,
  val performanceId: Long,
  val holdGroupKey: String,
  val storedHoldDetailJsons: List<String>,
  val holdDetailKeys: List<String>,
  val holdDetails: List<VenueSeatHoldDetail>,
  val holdVenueSeatEntries: List<HoldVenueSeatEntry>,
)

data class HoldVenueSeatEntry(val key: String, val holdId: String, val venueSeatId: Long)
