SET(JS_INCLUDE_DIRS ${JSC_INCLUDE_DIR})
# note currently nothing needed here...
SET(JS_LIBRARY_DIRS "")
SET(JS_LIBRARIES ${JSC})
add_subdirectory(redis)
