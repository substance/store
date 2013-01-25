{
  "targets": [
    {
      'target_name': "redis_node_wrapper",
      'type': "none",
      'actions': [
        {
          'variables': {
            'swig_exe': 'build/ext/swig/swig/preinst-swig',
            'node_wrapper': 'build/generated/src/native/redis/node/redis_node.cxx',
            'jsobjects_swig': 'build/ext/jsobjects/jsobjects/swig'
          },
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
      ]
    }
  ]
}
