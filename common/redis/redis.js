import { config } from "common/index.js";

import ioredis from 'ioredis';

const Connection = new ioredis({
    port: config.redis.port,
    host: config.redis.host,
    password: config.redis.password,
    db: config.redis.database,
    keyPrefix: config.application.name + '-',

    connectionName: config.application.name,
    //retryStrategy:
    //commandTimeout:
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    reconnectOnError: null,
    readOnly: false,
    stringNumbers: false,
    //connectTimeout: 
    //maxRetriesPerRequest: 20,
    //maxLoadingRetryTime: 10000,
    enableAutoPipelining: true,
    autoPipeliningIgnoredCommands: [],
    offlineQueue: true,
    commandQueue: true,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    lazyConnect: false,
    //disconnectTimeout:
    //tls:
});

class Redis
{
    constructor() { console.error("Redis has been instantiated!"); }
    static end() { Connection.quit(); }
    static get_raw() { return Connection; }

    static set(key, value) { return Connection.set(key, value); }
    static set_expire(key, value, expiration) { return Connection.setex(key, expiration / 1000, value); }
    static set_noexpire(key, value) { return Connection.set(key, value, "KEEPTTL"); }
    
    static get(key) { return Connection.get(key); }
    static get_delete(key) { return Connection.getdel(key); }
    static async get_expire(key, expiration) { return (await Connection.multi().get(key).expire(key, expiration / 1000).exec())[0][1]; }

    static delete(...keys) { return (keys.length == 0) ? [ ] : Connection.del(...keys); }

};

export default Redis;