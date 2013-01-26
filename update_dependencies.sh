#!/bin/sh

# helper scripts to install all externals for the building the node.js extension

EXTERNALS=/tmp/redis_node_externals

if [ ! -d $EXTERNALS ]; then
  mkdir $EXTERNALS
fi

cd $EXTERNALS

######################
# boost
boost_modules="config detail exception smart_ptr algorithm iterator mpl range type_traits preprocessor utility concept function bind format optional"

if [ ! -d boost ]; then
  svn co --depth files http://svn.boost.org/svn/boost/tags/release/Boost_1_50_0/boost
  cd boost
  svn update $boost_modules
  cd ..
fi

######################
# swig-v8

if [ ! -d swig-v8 ]; then
  git clone https://github.com/oliver----/swig-v8.git
fi

cd swig-v8

if [ ! -f configure ]; then
  ./autogen.sh
fi

if [ ! -f Makefile ]; then
  ./configure
fi

# always pull

git pull origin devel
make

cd ..

######################
# jsobjects

if [ ! -d jsobjects ]; then
  git clone https://github.com/oliver----/jsobjects.git
fi

cd jsobjects

if [ ! -d build ]; then
  mkdir build
fi

#if [ ! -f build/CMakeCache.txt ]; then
  cd build
  cmake -DENABLE_V8=OFF -DEXTERNALS_DIR="$EXTERNALS" -DCMAKE_PREFIX_PATH="$EXTERNALS" ..
  cd ..
#fi

git pull origin master
cd build
make
cd ..

cd ..

######################
# hiredis
if [ ! -d hiredis ]; then
  git clone https://github.com/redis/hiredis.git
fi

cd hiredis
make static
cd ..

