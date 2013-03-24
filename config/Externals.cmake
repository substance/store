include(ExternalProject)

FIND_PACKAGE(Boost REQUIRED)

if(ENABLE_TESTS)
	set (GTEST_DIR ${EXTERNALS_DIR}/gtest)
	set(GTEST_INCLUDE_DIRS ${GTEST_DIR}/gtest/include)
	set(GTEST_LIB_DIRS ${GTEST_DIR}/bin)
	set(GTEST_LIBS gtest gtest_main)
endif()

if(ENABLE_JSC)
  include(JavaScriptCore)
endif()

if (ENABLE_V8)
  include(V8)
endif()

if(NOT EXISTS ${SWIG_COMMAND})
  FIND_PROGRAM(SWIG_COMMAND NAMES preinst-swig)
  if(NOT EXISTS ${SWIG_COMMAND})
	FIND_PROGRAM(SWIG_COMMAND NAMES swig)
	  if(NOT EXISTS ${SWIG_COMMAND})
    	message(FATAL_ERROR "SWIG_COMMAND required: swig or preinst-swig")
      endif()
  endif()
endif()

# jsobjects
set(JSOBJECTS_DIR ${EXTERNALS_DIR}/jsobjects)
if(NOT EXISTS ${JSOBJECTS_DIR})
	message(FATAL_ERROR "JSOBJECTS_DIR does not exist: ${JSOBJECTS_DIR}.")
endif()
set(jsobjects_INCLUDE_DIRS ${JSOBJECTS_DIR}/include)
set(jsobjects_SWIG_INCLUDE_DIRS ${JSOBJECTS_DIR}/swig)

# hiredis
set (HIREDIS_DIR ${EXTERNALS_DIR}/hiredis)
set(HIREDIS_INCLUDE_DIRS ${HIREDIS_DIR})
set(HIREDIS_LIB_DIRS "${HIREDIS_DIR}")
set(HIREDIS_LIBS libhiredis.a)
