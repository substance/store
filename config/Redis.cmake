set(DOWNLOAD_DIR ${EXTERNALS_DIR}/reidsdb)
set (REDIS_INCLUDED ON CACHE INTERNAL "" FORCE)

if (NOT REDIS_INCLUDED AND DOWNLOAD_EXTERNALS)

  # Configure hiredis
  # -----------------
  ExternalProject_Add(redisdb
    GIT_REPOSITORY "https://github.com/antirez/redis.git"
    GIT_TAG "2.6.6"
    DOWNLOAD_DIR ${DOWNLOAD_DIR}
    SOURCE_DIR ${DOWNLOAD_DIR}/redis
    BINARY_DIR ${DOWNLOAD_DIR}/redis
    STAMP_DIR ${DOWNLOAD_DIR}/stamp
    TMP_DIR ${DOWNLOAD_DIR}/tmp
    UPDATE_COMMAND "" # don't update, i.e., always use the same version
    CONFIGURE_COMMAND "" # skip configure
    BUILD_COMMAND make
    INSTALL_COMMAND make PREFIX=${DOWNLOAD_DIR} install
  )

else ()

endif ()
