import config from "common/configs/config.js";

import ioredis from 'ioredis';

class Redis
{
    #Connection;
    static #DefaultRedisOptions = {
        connectionName: config.application,
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
    };
    constructor(options) { this.#Connection = new ioredis({ ...Redis.#DefaultRedisOptions, ...options }); }    
    end() { this.#Connection.quit(); }
    get_raw() { return this.#Connection; }

    set(key, value) { return this.#Connection.set(key, value); }
    set_expire(key, value, expiration) { return this.#Connection.setex(key, expiration / 1000, value); }
    set_keepttl(key, value) { return this.#Connection.set(key, value, "KEEPTTL"); }
    
    get(key) { return this.#Connection.get(key); }
    get_delete(key) { return this.#Connection.getdel(key); }
    async get_expire(key, expiration) { return (await this.#Connection.multi().get(key).expire(key, expiration / 1000).exec())[0][1]; }

    delete(...keys) { return (keys.length == 0) ? [ ] : this.#Connection.del(...keys); }

};

const Cache = new Redis(config.redis);
export { Cache };