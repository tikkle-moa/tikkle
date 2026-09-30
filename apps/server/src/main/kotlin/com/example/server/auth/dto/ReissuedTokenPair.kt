package com.example.server.auth.dto

data class ReissuedTokenPair(val accessToken: String, val refreshToken: String)
