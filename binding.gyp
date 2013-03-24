{
  "variables": {
    'externals': '/tmp/substance',
    'swig_exe': '<(externals)/swig/preinst-swig',
    'node_wrapper': 'build/generated/src/native/redis/node/redis_node.cxx',
    'jsobjects_swig': '<(externals)/jsobjects/swig'
  },
  "targets": [
    {
      "target_name": "redis",
      'actions': [
        {
          'action_name': 'swigjs',
          'inputs': [
            'src/native/redis/redis_node.i',
            'src/native/redis/redis_access.hpp',
            'src/native/redis/redis_error.hpp'
          ],
          'outputs': [
            '<@(node_wrapper)'
          ],
          'action': ['<@(swig_exe)', '-c++', '-javascript', '-v8', '-no-moduleobject',
                     '-I<@(jsobjects_swig)', '-o', '<@(node_wrapper)',
                     'src/native/redis/redis_node.i']
        }
      ],
      "sources": [
          "src/native/redis/redis_error.cpp",
          "src/native/redis/hiredis_access_impl.cxx",
          "build/generated/src/native/redis/node/redis_node.cxx"
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
