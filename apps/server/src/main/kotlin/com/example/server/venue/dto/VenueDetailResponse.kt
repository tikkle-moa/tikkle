package com.example.server.venue.dto

data class VenueDetailResponse(val venue: VenueResponse, val venueSeats: List<VenueSeatResponse>)
