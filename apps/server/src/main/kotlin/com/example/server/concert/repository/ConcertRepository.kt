package com.example.server.concert.repository

import com.example.server.concert.entity.Concert
import org.springframework.data.jpa.repository.JpaRepository

interface ConcertRepository : JpaRepository<Concert, Long>
