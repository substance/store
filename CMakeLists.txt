project(substance.store)
cmake_minimum_required(VERSION 2.8.4)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} ${PROJECT_SOURCE_DIR}/config)

set(EXTERNALS_DIR ${PROJECT_SOURCE_DIR}/build/ext CACHE STRING "Directory where external projects should be downloaded to")
set(EXTERNALS_ONLY OFF CACHE BOOL "Set this if you want to build externals only. (ON|OFF)")
set(ENABLE_DEVELOPER_EXTRAS OFF CACHE BOOL "Activate developer extras (e.g., WebInspector). (ON|OFF)")

set(ENABLE_JSC ON)

set(ENABLE_NODEJS ON CACHE BOOL "Enable test suite. (ON|OFF)")
set(ENABLE_TESTING ON CACHE BOOL "Enable test suite. (ON|OFF)")

if(ENABLE_NODEJS)
	set(ENABLE_V8 ON)
endif()

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
