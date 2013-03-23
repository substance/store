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

/* important: declare all methods which create new instances here */
%newobject RedisAccess::Create;
%newobject RedisAccess::asList;
%newobject RedisAccess::asHash;

%include "redis_error.hpp"
%include "redis_access.hpp"

%node(redis)
