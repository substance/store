set(DOWNLOAD_DIR ${EXTERNALS_DIR}/nodejs)
set(NODE_ROOT_DIR ${SUBSTANCE_STORE_DIST_FOLDER}/node CACHE INTERNAL "")

if (DOWNLOAD_EXTERNALS)

  ExternalProject_Add(nodejs
    URL "https://github.com/joyent/node/archive/v0.8.18.tar.gz"
    PREFIX ${DOWNLOAD_DIR}/nodejs
    DOWNLOAD_DIR ${DOWNLOAD_DIR}
    STAMP_DIR ${DOWNLOAD_DIR}/stamp
    SOURCE_DIR ${DOWNLOAD_DIR}/nodejs
    BINARY_DIR ${DOWNLOAD_DIR}/nodejs
    UPDATE_COMMAND ""
    CONFIGURE_COMMAND ./configure --prefix=${NODE_ROOT_DIR}
    BUILD_COMMAND make
    INSTALL_COMMAND make install
  )

endif ()

set(NODE_INCLUDE_DIRS
    ${NODE_ROOT_DIR}/include/node
)

set(V8_INCLUDE_DIRS "${NODE_ROOT_DIR}/deps/v8/include" CACHE INTERNAL "")
