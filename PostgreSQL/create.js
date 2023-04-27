import config from "common/configs/config.js";

import pg from 'pg';
const PostgreSQL = new pg.Pool({
    ...config.postgreSQL.internal,
    database: "postgres",
    parseInputDatesAsUTC: true,
    application_name: config.application
});


await PostgreSQL.query(`CREATE DATABASE ${config.postgreSQL.internal.database} TEMPLATE template0 ENCODING UTF8`);
console.info(`Created database ${config.postgreSQL.internal.database}`);


PostgreSQL.end();