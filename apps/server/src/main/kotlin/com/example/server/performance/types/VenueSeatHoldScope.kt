package com.example.server.performance.types

object VenueSeatHoldScope {
  private const val GROUP_PREFIX = "group:"
  private const val PERSONAL_PREFIX = "personal:"

  fun id(groupId: Long?, userId: Long, performanceId: Long): String {
    if (groupId != null) return "$GROUP_PREFIX$groupId"
    return "$PERSONAL_PREFIX$userId:$performanceId"
  }

  fun getGroupId(scopeId: String): Long? {
    if (!isGroup(scopeId)) return null
    return scopeId.removePrefix(GROUP_PREFIX).toLongOrNull()
  }

  fun isGroup(scopeId: String): Boolean = scopeId.startsWith(GROUP_PREFIX)
  fun isPersonal(scopeId: String): Boolean = scopeId.startsWith(PERSONAL_PREFIX)
}
