{
  "variables": {
    'externals': '/tmp/redis_node/externals',
    'swig_exe': '<(externals)/swig-v8/preinst-swig',
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
          "/usr/include/boost"
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
                "-L<(externals)/hiredis",
                "-L<(externals)/jsobjects/build/src/v8"
              ]
            }
          }
        ]
      ]
    }
  ]
}
