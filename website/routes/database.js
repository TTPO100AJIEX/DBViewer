import config from "common/configs/config.js";
import { TargetDatabase, InternalDatabase } from "common/postgreSQL/postgreSQL.js";

import get_database_info from "./utils/database/get_database_info.js";
import get_table_layout from "./utils/database/get_table_layout.js";
import get_table_name from "./utils/database/get_table_name.js";

async function get_database(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);
    return res.render("database.ejs", await get_database_info(TargetDatabase));
}

async function get_table(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);
    const [ { database_name, tables }, columns ] = await Promise.all([ get_database_info(TargetDatabase), get_table_layout(TargetDatabase, "id", req.query.id) ]);
    return res.render("table.ejs", { database_name, tables, columns });
}



import compile_websocket_handler from './utils/compile_websocket_handler.js';
const weboscket_data_handler = await compile_websocket_handler("websocket_data_routes");
function websocket_data(connection, req)
{
    const errorHandler = err => { if (config.stage == "testing") console.error(err); };
    connection.socket.on("message", message => weboscket_data_handler(connection, req, message.toString()).catch(errorHandler));
    
    const cfg = { graph_records: config.graph_records, group_size: config.group_size, update_interval: config.update_interval };
    connection.socket.send(JSON.stringify({ eventName: "config", data: cfg }));
}



import Ajv from "ajv/dist/jtd.js";
const ajv = new Ajv();
const actionsParser = ajv.compileParser({
    elements:
    {
        discriminator: "type",
        mapping:
        {
            "INSERT": { properties: { data: { values: { type: "string" } } } },
            "DELETE": { properties: { id: { values: { type: "string" } } } },
            "UPDATE": { properties: { data: { values: { type: "string" } }, id: { values: { type: "string" } } } }
        }
    }
});
async function post_data(req, res)
{
    const actions = actionsParser(req.body.actions);
    if (!actions) return res.error(400);
    if (actions.length == 0) return res.redirect(`/table?id=${req.body.table}`);
    if (!req.authorization.permissions.includes("I") && actions.find(action => action.type == "INSERT")) return res.error(403);
    if (!req.authorization.permissions.includes("U") && actions.find(action => action.type == "UPDATE")) return res.error(403);
    if (!req.authorization.permissions.includes("D") && actions.find(action => action.type == "DELETE")) return res.error(403);
    
    const { schema, table } = await get_table_name(TargetDatabase, req.body.table);
    function get_action_query(action)
    {
        function build_condition(identifier = { })
        {
            return {
                conditions: Object.values(identifier).map(value => Array.isArray(value) ? `%I = ARRAY[%L]::text[]` : "%I = %L").join(" AND "),
                params: Object.entries(identifier).flat()
            }
        }
        
        switch (action.type)
        {
            case "DELETE":
            {
                const { conditions, params: conditionsParams } = build_condition(action.id);
                return {
                    query: `DELETE FROM %I.%I WHERE ${conditions}`,
                    params: [ schema, table, ...conditionsParams ]
                };
            }
            case "INSERT":
            {
                return {
                    query: `INSERT INTO %I.%I (${Object.keys(action.data).fill("%I").join(', ')}) OVERRIDING USER VALUE
                            VALUES (${Object.values(action.data).map(value => Array.isArray(value) ? `ARRAY[%L]::text[]` : "%L")})`,
                    params: [ schema, table, ...Object.keys(action.data), ...Object.values(action.data) ]
                }
            }
            case "UPDATE":
            {
                const { conditions, params: conditionsParams } = build_condition(action.id);
                return {
                    query: `UPDATE %I.%I SET ${Object.values(action.data).map(value => Array.isArray(value) ? `%I = ARRAY[%L]::text[]` : "%I = %L").join(", ")} WHERE ${conditions}`,
                    params: [ schema, table, ...(Object.entries(action.data).flat()), ...conditionsParams ]
                }
            }
            default: throw `Unknown action type ${action.type}`;
        }
    }

    let queries = [ ], logs = [ ];
    for (const action of actions)
    {
        if (action.data) action.data = Object.fromEntries(Object.entries(action.data).map(entry => [ entry[0], entry[1] || null ]));
        const { query, params } = get_action_query(action);
        queries.push(TargetDatabase.format(query, ...params));
        logs.push(InternalDatabase.format(`INSERT INTO logs (type, data, userid, query, query_params) VALUES (%L, %L, %L, %L, %L)`, action.type, `${schema}.${table}`, req.authorization.user_id, query, JSON.stringify(params)));
    }
    await TargetDatabase.query_multiple(queries);
    await InternalDatabase.query_multiple(logs);
    return res.redirect(`/table?id=${req.body.table}`);
}


import { types as schema_types, EMPTY_GET_SCHEMA } from "./utils/schemas/schemas.js";
const TABLE_GET_SCHEMA = {
    query:
    {
        type: "object",
        required: [ "id" ],
        additionalProperties: false,
        properties:
        {
            "id": { type: "integer" }
        }
    }
};
const DATA_POST_SCHEMA = {
    body:
    {
        type: "object",
        required: [ "authentication", "table", "actions" ],
        additionalProperties: false,
        properties:
        {
            "authentication": schema_types.authentication,
            "table": { type: "integer" },
            "actions": { type: "string" }
        }
    }
};
export default [
    { method: "GET",  path: "/database", access: "authorization", schema: EMPTY_GET_SCHEMA, handler: get_database },
    { method: "GET",  path: "/table", access: "authorization", schema: TABLE_GET_SCHEMA, handler: get_table },
    { method: "GET",  path: "/data", websocket: true, access: "authorization", schema: EMPTY_GET_SCHEMA, handler: websocket_data },
    { method: "POST",  path: "/data", access: "authorization", schema: DATA_POST_SCHEMA, handler: post_data }
];