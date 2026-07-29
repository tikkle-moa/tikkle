package com.example.server.auth.repository

import com.example.server.auth.entity.OauthAccount
import org.springframework.data.jpa.repository.JpaRepository

interface OAuthAccountRepository : JpaRepository<OauthAccount, Long>
