project(substance.store)
cmake_minimum_required(VERSION 2.8.4)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} ${PROJECT_SOURCE_DIR}/config)

set(EXTERNALS_DIR ${PROJECT_SOURCE_DIR}/build/ext CACHE STRING "Directory where external projects should be downloaded to")
set(EXTERNALS_ONLY OFF CACHE BOOL "Set this if you want to build externals only. (ON|OFF)")
set(ENABLE_JSC ON CACHE BOOL "Build JSC extension. (ON|OFF)")
set(ENABLE_V8 OFF CACHE BOOL "Build V8 extension. Note: node extensions are built using node-gyp.")
set(ENABLE_TESTING OFF CACHE BOOL "Enable test suite. (ON|OFF)")
set(SWIG_COMMAND "" CACHE PATH "Path to swig executable. REQUIRED")

# Configure external projects
# ===========================
if (EXTERNALS_ONLY OR IMPORT)
  set (DOWNLOAD_EXTERNALS ON)
endif()

include(Externals)

# Process subdirectories
# ======================
if (NOT EXTERNALS_ONLY OR IMPORT)

  include(ExportTarget)
  include(ConfigureVariables)

  add_subdirectory(src/native)

endif () # EXTERNALS_ONLY
