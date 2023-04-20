import { config, TargetDatabase, InternalDatabase, Redis } from "common/index.js";
TargetDatabase.end(); Redis.end();

await InternalDatabase.query_multiple([
    `
    CREATE TABLE users
    (
        id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        login VARCHAR(100) NOT NULL UNIQUE,
        password CHAR(60) NOT NULL,
        read BOOL NOT NULL DEFAULT FALSE,
        insert BOOL NOT NULL DEFAULT FALSE,
        update BOOL NOT NULL DEFAULT FALSE,
        delete BOOL NOT NULL DEFAULT FALSE,
        admin BOOL NOT NULL DEFAULT FALSE,
        permissions CHAR(5) GENERATED ALWAYS AS (
            (CASE WHEN (read OR admin) THEN 'R' ELSE '-' END) ||
            (CASE WHEN (insert OR admin) THEN 'I' ELSE '-' END) ||
            (CASE WHEN (update OR admin) THEN 'U' ELSE '-' END) ||
            (CASE WHEN (delete OR admin) THEN 'D' ELSE '-' END) ||
            (CASE WHEN admin THEN 'A' ELSE '-' END)
        ) STORED
    )
    `,
    `CREATE TYPE REQUEST_TYPE AS ENUM ('SELECT', 'INSERT', 'UPDATE', 'DELETE')`,
    `
    CREATE TABLE logs
    (
        id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        type REQUEST_TYPE NOT NULL,
        data TEXT NOT NULL,
        userid SMALLINT REFERENCES users(id) MATCH FULL ON DELETE SET NULL ON UPDATE CASCADE,
        query TEXT NOT NULL,
        query_params TEXT NOT NULL DEFAULT '[ ]'
    )`
]);

console.log(`Created tables`);


InternalDatabase.end();


/*
CREATE TABLE table_name ( [
      column_name data_type [ column_constraint [ ... ] ]
    ] )
    [ WITH ( storage_parameter [= value] [, ... ] ) | WITHOUT OIDS ]
    [ TABLESPACE tablespace_name ]

where column_constraint is:
NOT NULL
CHECK ( expression )
UNIQUE
PRIMARY KEY
REFERENCES reftable [ ( refcolumn ) ] [ MATCH FULL | MATCH PARTIAL | MATCH SIMPLE ] [ ON DELETE referential_action ] [ ON UPDATE referential_action ]
DEFAULT 9.99

https://www.postgresql.org/docs/current/datatype.html
*/