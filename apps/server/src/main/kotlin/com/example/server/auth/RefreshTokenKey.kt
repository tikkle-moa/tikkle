package com.example.server.auth

internal fun refreshTokenKey(tokenId: String): String = "auth:refresh:$tokenId"
