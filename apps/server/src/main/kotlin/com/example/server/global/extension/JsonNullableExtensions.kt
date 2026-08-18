package com.example.server.global.extension

import org.openapitools.jackson.nullable.JsonNullable

inline fun <T> JsonNullable<T>.ifPresent(action: (T) -> Unit) {
  if (isPresent) {
    action(get())
  }
}
