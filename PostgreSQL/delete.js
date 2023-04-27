import config from "common/configs/config.js";

import pg from 'pg';
const PostgreSQL = new pg.Pool({
    ...config.postgreSQL.internal,
    database: "postgres",
    parseInputDatesAsUTC: true,
    application_name: config.application
});


await PostgreSQL.query(`DROP DATABASE ${config.postgreSQL.internal.database} WITH (FORCE)`);
console.info(`Deleted database ${config.postgreSQL.internal.database}`);


PostgreSQL.end();