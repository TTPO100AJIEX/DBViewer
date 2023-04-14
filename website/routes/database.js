import { PostgreSQL, TargetDatabase, config } from "common/index.js";

async function get_database(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);
    const [ { current_database: databaseName }, tables ] = await TargetDatabase.query_multiple([
        { query: `SELECT current_database()`, one_response: true },
        
        `SELECT pg_class.oid AS id, (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS name
        FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE (pg_class.relkind = 'r' OR pg_class.relkind = 'v' OR pg_class.relkind = 'm') AND pg_namespace.nspname != 'information_schema' AND NOT starts_with(pg_namespace.nspname, 'pg_')`,
    ]);
    return res.render("database.ejs", { databaseName, tables });
}

async function get_table(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);

    const [ { current_database: databaseName }, tables, columns ] = await TargetDatabase.query_multiple([
        { query: `SELECT current_database()`, one_response: true },
        
        `SELECT pg_class.oid AS id, (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS name
        FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE (pg_class.relkind = 'r' OR pg_class.relkind = 'v' OR pg_class.relkind = 'm') AND pg_namespace.nspname != 'information_schema' AND NOT starts_with(pg_namespace.nspname, 'pg_')`,
        
        {
            query: PostgreSQL.format(`WITH enums (enumtypid, enumlabels) AS ( SELECT enumtypid, array_agg(enumlabel::text) AS enumlabels FROM pg_enum GROUP BY enumtypid ) SELECT
                    pg_attribute.attname AS name, pg_attribute.atttypid AS type_id, pg_attribute.atttypmod AS type_mod, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) AS type_name,
                    pg_attribute.attidentity = 'a' AS flags_IA, pg_attribute.attidentity = 'a' AS flags_ID,
                    pg_attribute.attnotnull AS flags_NN, pg_attribute.atthasdef AS flags_D, (pg_attribute.attgenerated = 's') AS flags_G,
                    EXISTS( SELECT * FROM pg_constraint WHERE conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'u' ) AS flags_U,
                    EXISTS( SELECT * FROM pg_constraint WHERE conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'p' ) AS flags_PK,
                    enums.enumlabels AS enumlabels
                FROM pg_attribute INNER JOIN pg_class ON pg_class.oid = pg_attribute.attrelid LEFT JOIN enums ON enums.enumtypid = pg_attribute.atttypid
                WHERE pg_class.oid = %L AND pg_attribute.attnum > 0 AND NOT pg_attribute.attisdropped
                ORDER BY attnum ASC`, req.query.id),
            parse: true
        }
    ]);
    
    return res.render("table.ejs", { databaseName, tables, columns });
}


import get_database_data from "./data/database_data.js";
import get_table_data from "./data/table_data.js";

async function websocket_data(connection, req)
{
    const handlers = {
        database_data:
        {
            get: get_database_data
        },
        table_data:
        {
            get: get_table_data
        }
    };

    connection.socket.on("message", message =>
    {
        const msg = JSON.parse(message.toString());
        handlers[msg.requestName][msg.method](msg.data, connection.socket);
    });

    connection.socket.send(JSON.stringify({
        eventName: "config",
        data: { graph_records: config.graph_records, group_size: config.group_size, update_interval: config.update_interval }
    }));
}

export { get_database, get_table, websocket_data };