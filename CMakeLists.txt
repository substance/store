project(substance.store)
cmake_minimum_required(VERSION 2.8.4)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} ${PROJECT_SOURCE_DIR}/config)

set(EXTERNALS_DIR ${PROJECT_SOURCE_DIR}/build/ext CACHE STRING "Directory where external projects should be downloaded to")
set(ENABLE_JSC ON CACHE BOOL "Build JSC extension. (ON|OFF)")
set(ENABLE_V8 OFF CACHE BOOL "Build V8 extension. Note: node extensions are built using node-gyp.")
set(ENABLE_TESTS OFF CACHE BOOL "Enable test suite. (ON|OFF)")
set(SWIG_COMMAND "" CACHE PATH "Path to swig executable. REQUIRED")

# Configure external projects
# ===========================
include(Externals)

# Process subdirectories
# ======================

include(ExportTarget)
include(ConfigureVariables)

add_subdirectory(src/native)
