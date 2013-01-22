IF (NOT APPLE AND UNIX)

  # use pkg-config module to configure webkit-1.0
  include(FindPkgConfig)
  pkg_check_modules (webkit webkit-1.0 REQUIRED)

ENDIF () # NOT APPLE AND UNIX
