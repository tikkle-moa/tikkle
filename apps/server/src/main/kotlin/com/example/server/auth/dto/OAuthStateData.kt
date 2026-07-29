package com.example.server.auth.dto

import com.example.server.auth.types.Mode
import com.example.server.auth.types.OAuthProvider

data class OAuthStateData(val provider: OAuthProvider, val redirectUri: String, val mode: Mode, val userId: Long?)
