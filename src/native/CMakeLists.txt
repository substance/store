SET(JS_LIBRARY_DIRS ${jsobjects_LIBRARY_DIRS})
SET(JS_LIBRARIES ${JSC} jsobjects_jsc)
SET(REDIS_CONF ${CMAKE_CURRENT_SOURCE_DIR}/redis.conf)

add_subdirectory(redis)
