include(ExternalProject)

include(BoostMinimal)
include(GTest-1.6)
include(Hiredis)
include(Redis)
include(JavaScriptCore)
include(JSObjects)
include(SwigJS)

if (ENABLE_V8)
  include(V8)
endif()
