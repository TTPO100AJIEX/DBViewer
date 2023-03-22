import config from "./configs/config.json" assert { type: "json" };
import Utils from "./utils/Utils.js";
import PostgreSQL, { TargetDatabase, InternalDatabase } from "./postgreSQL/postgreSQL.js";
import Redis from "./redis/redis.js";
export { config, Utils, PostgreSQL, TargetDatabase, InternalDatabase, Redis };