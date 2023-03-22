import { config, TargetDatabase, InternalDatabase, Redis } from "common/index.js";
TargetDatabase.end(); InternalDatabase.end(); Redis.end();

import pg from 'pg';
const Raw_PostgreSQL = new pg.Pool({
    ...config.postgreSQL.internal,
    "database": "postgres",
    "parseInputDatesAsUTC": true,
    "application_name": config.application
});


await Raw_PostgreSQL.query(`CREATE DATABASE ${config.postgreSQL.internal.database} TEMPLATE template0 ENCODING UTF8`);
console.info(`Created database ${config.postgreSQL.internal.database}`);


Raw_PostgreSQL.end();