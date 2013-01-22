%module redis

%header %{
#define SWIG 1

#include <jsobjects_v8.hpp>
#include <redis_error.hpp>
#include <redis_access.hpp>

using namespace jsobjects;
%}

%include <std_string.i>
%include <node.i>

%include <jsobjects.i>

%include "redis_error.hpp"
%include "redis_access.hpp"

%node(redis)
