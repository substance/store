set (DOWNLOAD_DIR ${DOWNLOAD_DIR}/hiredis)
set (HIREDIS_INCLUDED ON CACHE INTERNAL "" FORCE)

if (NOT HIREDIS_INCLUDED AND DOWNLOAD_EXTERNALS)

  # Configure hiredis
  # -----------------
  ExternalProject_Add(hiredis
    GIT_REPOSITORY "https://github.com/redis/hiredis.git"
    DOWNLOAD_DIR ${DOWNLOAD_DIR}
    SOURCE_DIR ${DOWNLOAD_DIR}/hiredis
    BINARY_DIR ${DOWNLOAD_DIR}/hiredis
    STAMP_DIR ${DOWNLOAD_DIR}/stamp
    TMP_DIR ${DOWNLOAD_DIR}/tmp
    UPDATE_COMMAND "" # don't update, i.e., always use the same version
    CONFIGURE_COMMAND "" # skip configure
    BUILD_COMMAND make static
    INSTALL_COMMAND "" # skip install
  )

endif ()

set(HIREDIS_INCLUDE_DIRS ${DOWNLOAD_DIR}/hiredis)
set(HIREDIS_LIB_DIRS "${DOWNLOAD_DIR}/hiredis")
set(HIREDIS_LIBS libhiredis.a)

