#!/bin/sh

# helper scripts to install all externals for the building the node.js extension

if [ ! -d /tmp/redis_node ]; then
  mkdir /tmp/redis_node
fi

cd /tmp/redis_node

# check if the externals folder exists
if [ ! -d externals ]; then
  mkdir externals
fi

cd externals

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

if [ ! -f build/CMakeCache.txt ]; then
  cd build
  cmake -DENABLE_V8=ON ..
  cd ..
fi

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
