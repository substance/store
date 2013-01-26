include(ExternalProject)

FIND_PACKAGE(Boost)
if(Boost-NOTFOUND)
  include(BoostMinimal)
endif()

if(NOT EXISTS ${SWIG_COMMAND})
  FIND_PROGRAM(SWIG_COMMAND NAMES preinst-swig)
  if(NOT EXISTS ${SWIG_COMMAND})
    message("###### NOTE: you can avoid downloading and building the swig-v8 project by providing a CMake variable 'SWIG_COMMAND'")
    include(SwigJS)
  endif()
endif()

if(ENABLE_TESTS)
  include(GTest-1.6)
endif()

if(ENABLE_JSC)
  include(JavaScriptCore)
endif()

if (ENABLE_V8)
  include(V8)
endif()

include(JSObjects)
include(Hiredis)
