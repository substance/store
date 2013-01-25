find_path(V8_INCLUDE_DIR v8.h)
find_library(V8 v8)

if (V8_INCLUDE_DIR-NOTFOUND OR V8-NOTFOUND )
  message(FATAL_ERROR "Could not find v8.")
endif()
