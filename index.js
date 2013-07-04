module.exports = {
  Store: require('./src/store'),
  AsyncStore: require('./src/async_store'),
  LocalStore: require('./src/local_store'),
  MemoryStore: require('./src/memory_store'),
  RedisStore: require('./src/redis_store')
};