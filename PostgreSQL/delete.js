import { config, TargetDatabase, InternalDatabase, Redis } from "common/index.js";
TargetDatabase.end(); InternalDatabase.end(); Redis.end();

import pg from 'pg';
const Raw_PostgreSQL = new pg.Pool({
    ...config.postgreSQL.internal,
    "database": "postgres",
    "parseInputDatesAsUTC": true,
    "application_name": config.application
});


await Raw_PostgreSQL.query(`DROP DATABASE ${config.postgreSQL.internal.database} WITH (FORCE)`);
console.info(`Deleted database ${config.postgreSQL.internal.database}`);


Raw_PostgreSQL.end();