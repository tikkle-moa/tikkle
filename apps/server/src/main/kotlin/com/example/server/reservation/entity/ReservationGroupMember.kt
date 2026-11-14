package com.example.server.reservation.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
  name = "reservation_group_members",
  uniqueConstraints = [UniqueConstraint(name = "uq_reservation_group_member", columnNames = ["reservation_id", "user_id"])],
)
class ReservationGroupMember(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id", nullable = false)
  var reservation: Reservation,

  @Column(name = "user_id", nullable = false)
  var userId: Long,

  @Column(nullable = false, length = 50)
  var nickname: String,

  @Column(name = "profile_image_url", length = 500)
  var profileImageUrl: String?,
)
