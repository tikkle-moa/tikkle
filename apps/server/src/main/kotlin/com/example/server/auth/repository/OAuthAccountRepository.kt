package com.example.server.auth.repository

import com.example.server.auth.entity.OAuthAccount
import org.springframework.data.jpa.repository.JpaRepository

interface OAuthAccountRepository : JpaRepository<OAuthAccount, Long>
