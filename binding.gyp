{
  "variables": {
    'externals': '/tmp/substance',
  },
  "targets": [
    {
      "target_name": "redis",
      "sources": [
          "src/native/redis/redis_error.cpp",
          "src/native/redis/hiredis_access_impl.cxx",
          'build/generated/src/native/redis/node/redis_node.cxx'
      ],
      "include_dirs": [
          "src/native/redis",
          "<(externals)/jsobjects/include",
          "<(externals)/hiredis",
          "<(externals)"
      ],
      'conditions': [
          ['OS=="mac"',
            {
              "link_settings": {
                "libraries": [
                  "-lhiredis",
                ]
              },
              'xcode_settings': {
                'GCC_ENABLE_CPP_RTTI': 'YES',
                'GCC_ENABLE_CPP_EXCEPTIONS' : 'YES',
                'OTHER_LDFLAGS': [
                  "-L<(externals)/hiredis",
                ],
              }
            }
          ],
          ['OS=="linux" or OS=="freebsd" or OS=="openbsd" or OS=="solaris"',
            {
              'cflags!': [ '-fno-exceptions' ],
              'cflags_cc!': [ '-fno-exceptions', '-fno-rtti' ],
              "link_settings": {
                "libraries": [
                  "-lhiredis",
                ],
                "ldflags": [
                  "-L<(externals)/hiredis",
                ]
              }
            }
          ]
      ],
    }
  ]
}
