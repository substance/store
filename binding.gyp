{
  "targets": [
    {
      "target_name": "redis",
      "dependencies": [
          "./nodewrapper.gyp:redis_node_wrapper"
      ],
      "sources": [
          "src/native/redis/redis_error.cpp",
          "src/native/redis/hiredis_access_impl.cxx",
          "build/generated/src/native/redis/node/redis_node.cxx"
      ],
      "include_dirs": [
          "src/native/redis",
          "build/ext/jsobjects/jsobjects/include",
          "build/ext/hiredis/hiredis",
          "build/ext/boost"
      ],
      "conditions" : [
        [ 'OS == "linux"',
          {
            'cflags!': [ '-fno-exceptions' ],
            'cflags_cc!': [ '-fno-exceptions', '-fno-rtti' ],
            "link_settings": {
              "libraries": [
                "-lhiredis",
                "-ljavascriptcoregtk-1.0",
                "-ljsobjects_v8"
              ],
              "ldflags": [
                "-L/projects/substance/store/build/ext/hiredis/hiredis",
                "-L/projects/substance/store/build/ext/jsobjects/bin/src/v8"
              ]
            }
          }
        ]
      ]
    }
  ]
}
