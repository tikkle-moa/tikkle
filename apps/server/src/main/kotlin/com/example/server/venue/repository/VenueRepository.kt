package com.example.server.venue.repository

import com.example.server.venue.entity.Venue
import org.springframework.data.jpa.repository.JpaRepository

interface VenueRepository : JpaRepository<Venue, Long>
