import { InternalDatabase, PostgreSQL, TargetDatabase, config } from "common/index.js";

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
                    pg_attribute.attidentity = 'a' AS flags_IA, pg_attribute.attidentity = 'd' AS flags_ID,
                    pg_attribute.attnotnull AS flags_NN, pg_attribute.atthasdef AS flags_D, (pg_attribute.attgenerated = 's') AS flags_G,
                    EXISTS( SELECT * FROM pg_constraint WHERE pg_constraint.conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'u' ) AS flags_U,
                    EXISTS( SELECT * FROM pg_constraint WHERE pg_constraint.conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'p' ) AS flags_PK,
                    enums.enumlabels AS enumlabels
                FROM pg_attribute INNER JOIN pg_class ON pg_class.oid = pg_attribute.attrelid LEFT JOIN enums ON enums.enumtypid = pg_attribute.atttypid
                WHERE pg_class.oid = %L AND pg_attribute.attnum > 0 AND NOT pg_attribute.attisdropped
                ORDER BY attnum ASC`, req.query.id),
            parse: true
        }
    ]);

    return res.render("table.ejs", { databaseName, tables, columns });
}


import database_data from "./data/database_data.js";
import table_data from "./data/table_data.js";
import table_rows from "./data/table_rows.js";
import logs from "./data/logs.js";

async function websocket_data(connection, req)
{
    const handlers =
    {
        database_data: database_data,
        table_data: table_data,
        table_rows: table_rows,
        logs: logs
    };

    connection.socket.on("message", message =>
    {
        // TODO: ajv validation
        const msg = JSON.parse(message.toString());
        if (!handlers?.[msg.requestName]) return console.warn("Unknown message received: ", msg);
        handlers[msg.requestName](msg.data, connection.socket, req);
    });

    connection.socket.send(JSON.stringify({
        eventName: "config",
        data: { graph_records: config.graph_records, group_size: config.group_size, update_interval: config.update_interval }
    }));
}

async function post_data(req, res)
{
    // TODO: ajv validation
    const actions = JSON.parse(req.body.actions);
    if (actions.length == 0) return res.redirect(`/table?id=${req.body.table}`);
    
    const { schema, table } = await TargetDatabase.query(`SELECT pg_namespace.nspname AS schema, pg_class.relname AS table FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE pg_class.oid = $1`, [ req.body.table ], false, true);
    
    function build_where(identifier = { })
    {
        return {
            conditions: Object.values(identifier).map(value => Array.isArray(value) ? `%I = ARRAY[%L]::text[]` : "%I = %L").join(" AND "),
            params: Object.entries(identifier).flat()
        }
    }

    let queries = [ ], logs = [ ];
    for (const action of actions)
    {
        if (action.data) action.data = Object.fromEntries(Object.entries(action.data).map(entry => [ entry[0], (entry[1] === false || entry[1] === 0) ? entry[1] : (entry[1] || null) ]));
        const { conditions, params } = build_where(action.id);
        switch (action.type)
        {
            case "DELETE":
            {
                if (!req.authorization.permissions.includes("D")) return res.error(403);
                const query = PostgreSQL.format(`DELETE FROM %I.%I WHERE ${conditions}`, schema, table, ...params);
                queries.push(query);
                logs.push(PostgreSQL.format(`INSERT INTO logs (type, data, userid, query) VALUES ('DELETE', %L, %L, %L)`, `${schema}.${table}`, req.authorization.user_id, query));
                break;
            }
            case "INSERT":
            {
                if (!req.authorization.permissions.includes("I")) return res.error(403);
                const query = PostgreSQL.format(`INSERT INTO %I.%I (${new Array(Object.keys(action.data).length).fill("%I").join(', ')}) OVERRIDING USER VALUE
                                    VALUES (${Object.values(action.data).map(value => Array.isArray(value) ? `ARRAY[%L]::text[]` : "%L")})`,
                                    schema, table, ...Object.keys(action.data), ...Object.values(action.data));
                queries.push(query);
                logs.push(PostgreSQL.format(`INSERT INTO logs (type, data, userid, query) VALUES ('INSERT', %L, %L, %L)`, `${schema}.${table}`, req.authorization.user_id, query));
                break;
            }
            case "UPDATE":
            {
                if (!req.authorization.permissions.includes("U")) return res.error(403);
                for (const key in action.id) delete action.data[key];
                const query = PostgreSQL.format(`UPDATE %I.%I SET ${Object.values(action.data).map(value => Array.isArray(value) ? `%I = ARRAY[%L]::text[]` : "%I = %L").join(", ")}
                                                WHERE ${conditions}`, schema, table, ...(Object.entries(action.data).flat()), ...params);
                queries.push(query);
                logs.push(PostgreSQL.format(`INSERT INTO logs (type, data, userid, query) VALUES ('UPDATE', %L, %L, %L)`, `${schema}.${table}`, req.authorization.user_id, query));
                break;
            }
        }
    }
    await TargetDatabase.query_multiple(queries);
    await InternalDatabase.query_multiple(logs);
    return res.redirect(`/table?id=${req.body.table}`);
}

export { get_database, get_table, websocket_data, post_data };