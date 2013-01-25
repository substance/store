SET(JS_INCLUDE_DIRS ${JSC_INCLUDE_DIR})
SET(JS_LIBRARY_DIRS ${jsobjects_LIBRARY_DIRS})
SET(JS_LIBRARIES ${JSC} jsobjects_jsc)

add_subdirectory(redis)
