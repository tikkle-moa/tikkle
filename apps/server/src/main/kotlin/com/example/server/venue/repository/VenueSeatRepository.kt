package com.example.server.venue.repository

import com.example.server.venue.entity.VenueSeat
import org.springframework.data.jpa.repository.JpaRepository

interface VenueSeatRepository : JpaRepository<VenueSeat, Long>
