#!/bin/bash

echo "Executing $(pwd)/update.sh"

PROJECT_DIR=$(pwd)

# sanity check: executed in the root folder?
if [ ! -f src/store.js ]; then
  echo "store/update.sh must be executed in the root dir of the repository."
  exit -1
fi

##########################
# command line options
#
TMPDIR=$HOME/tmp/substance
EXTERNALS=$TMPDIR
VERBOSE=0
CMAKE_BUILD=0
BUILD_JSC_EXTENSION=0
BUILD_V8_EXTENSION=0
NODE=0

readopts() {
  while ((OPTIND<=$#)); do
    if getopts ":d:e:hbvn" opt; then
      case $opt in
        d)  EXTERNALS=$OPTARG;;
        e)  if [ $OPTARG == jsc ]; then
              BUILD_JSC_EXTENSION=1
            elif [ $OPTARG == v8 ]; then
              BUILD_V8_EXTENSION=1
            fi;;
        b)  CMAKE_BUILD=1;;
        v)  VERBOSE=1;;
        n)  NODE=1;;
        h)  echo "Usage: update.sh [-d <directory>] [-n] [-b [-e jsc | v8]] [-h] [-v]"
            echo "    -n: build store as node module"
            echo "    -b: build the store using cmake (library)"
            echo "    -e: build for 'jsc' or 'v8'"
            echo "    -v: verbose output"
            echo "    -h: display this help"
            exit;;
        *) ;;
      esac
    else
        let OPTIND++
    fi
  done
}

OPTIND=1
readopts "$@"

if [ $VERBOSE == 1 ]; then
  echo "Updating store..."
  echo "Storing into directory: $EXTERNALS"
  echo "Building: $BUILD"
  if [ $CMAKE_BUILD == 1 ]; then
    echo "JSC: $BUILD_JSC_EXTENSION"
    echo "V8: $BUILD_V8_EXTENSION"
  fi
fi

if [ ! -d $EXTERNALS ]; then
  mkdir -p $EXTERNALS
fi

######################
# boost
cd $EXTERNALS

boost_modules="config detail exception smart_ptr algorithm iterator mpl range type_traits preprocessor utility concept function bind format optional"

if [ ! -d boost ]; then
  svn co --depth files http://svn.boost.org/svn/boost/tags/release/Boost_1_50_0/boost
  cd boost
  svn update $boost_modules
fi

######################
# swig

cd $EXTERNALS

if [ ! -d swig ]; then
  git clone https://github.com/oliver----/swig-v8.git swig
fi

cd swig

if [ ! -f configure ]; then
  ./autogen.sh
fi

if [ ! -f Makefile ]; then
  ./configure
fi

# always pull
git pull origin devel
make

######################
# jsobjects
cd $EXTERNALS

if [ ! -d jsobjects ]; then
  git clone https://github.com/oliver----/jsobjects.git
fi

cd jsobjects
./update.sh -d $EXTERNALS

######################
# hiredis
cd $EXTERNALS

if [ ! -d hiredis ]; then
  git clone https://github.com/redis/hiredis.git
fi

cd hiredis
if [ ! -f hiredis/libhiredis.a ]; then
  make static
fi

######################
# Build the store

if [ $NODE == 1 ]; then
  WRAPPER_DIR="$PROJECT_DIR/build/generated/src/native/redis/node"
  NODE_WRAPPER="$WRAPPER_DIR/redis_node.cxx"
  SWIG_EXE="$EXTERNALS/swig/preinst-swig"

  GENERATE_WRAPPER=0

  if [ ! -f $NODE_WRAPPER ]; then
    GENERATE_WRAPPER=1
  elif test $PROJECT_DIR/src/native/redis/redis_node.i -nt $NODE_WRAPPER; then
    GENERATE_WRAPPER=1
  elif test $PROJECT_DIR/src/native/redis/redis_error.hpp -nt $NODE_WRAPPER; then
    GENERATE_WRAPPER=1
  elif test $PROJECT_DIR/src/native/redis/redis_access.hpp -nt $NODE_WRAPPER; then
    GENERATE_WRAPPER=1
  fi

  if [ $GENERATE_WRAPPER == 1 ]; then
    mkdir -p $WRAPPER_DIR
    $SWIG_EXE -c++ -javascript -v8 -no-moduleobject -I$EXTERNALS/jsobjects/swig -o $NODE_WRAPPER $PROJECT_DIR/src/native/redis/redis_node.i
  else
    echo "Node wrapper already up2date."
  fi
fi


if [ $CMAKE_BUILD == 1 ]; then
  echo "Building the store..."
  cd $PROJECT_DIR

  git pull

  if [ ! -d build ]; then
    mkdir build
  fi
  cd build
  if [ ! -f CMakeCache.txt ]; then
    CMAKE_ARGS="-DEXTERNALS_DIR=$EXTERNALS -DSWIG_COMMAND=$EXTERNALS/swig/preinst-swig -DCMAKE_PREFIX_PATH=$EXTERNALS"
    if [  $BUILD_V8_EXTENSION == 1 ]; then
      CMAKE_ARGS="$CMAKE_ARGS -DENABLE_V8=ON"
    fi
    if [  $BUILD_JSC_EXTENSION == 1 ]; then
      CMAKE_ARGS="$CMAKE_ARGS -DENABLE_JSC=ON"
    fi
    cmake  $CMAKE_ARGS ..
  fi
  make
fi
