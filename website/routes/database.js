import config from "common/configs/config.js";
import { TargetDatabase, InternalDatabase } from "common/postgreSQL/postgreSQL.js";



import databaseInfoQueries from "./utils/queries/databaseInfoQueries.js";
import tableLayoutQuerySrc from "./utils/queries/tableLayoutQuerySrc.js";

async function get_database(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);
    const [ { database_name }, tables ] = await TargetDatabase.query_multiple(databaseInfoQueries());
    return res.render("database.ejs", { database_name, tables });
}

async function get_table(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);
    const [ { database_name }, tables, columns ] = await TargetDatabase.query_multiple([
        ...databaseInfoQueries(),
        { query: TargetDatabase.format(tableLayoutQuerySrc("id"), req.query.id), parse: true }
    ]);
    return res.render("table.ejs", { database_name, tables, columns });
}



import compile_websocket_handler from './utils/compile_websocket_handler.js';
const weboscket_data_handler = await compile_websocket_handler("websocket_data_routes");
async function websocket_data(connection, req)
{
    connection.socket.on("message", message => weboscket_data_handler(connection, req, message.toString()).catch(err => { if (config.stage == "testing") console.error(err); }));
    connection.socket.send(JSON.stringify({ eventName: "config", data: { graph_records: config.graph_records, group_size: config.group_size, update_interval: config.update_interval } }));
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
import tableNameQuerySrc from "./utils/queries/tableNameQuerySrc.js";
async function post_data(req, res)
{
    const actions = actionsParser(req.body.actions);
    if (actions.length == 0) return res.redirect(`/table?id=${req.body.table}`);    
    if (!req.authorization.permissions.includes("I") && actions.find(action => action.type == "INSERT")) return res.error(403);
    if (!req.authorization.permissions.includes("U") && actions.find(action => action.type == "UPDATE")) return res.error(403);
    if (!req.authorization.permissions.includes("D") && actions.find(action => action.type == "DELETE")) return res.error(403);
    
    const { schema, table } = await TargetDatabase.query(tableNameQuerySrc(), [ req.body.table ], { one_response: true });
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
        switch (action.type)
        {
            case "DELETE":
            {
                const { conditions, params: conditionsParams } = build_where(action.id);
                const query = `DELETE FROM %I.%I WHERE ${conditions}`, params = [ schema, table, ...conditionsParams ];
                queries.push(TargetDatabase.format(query, ...params));
                logs.push(InternalDatabase.format(`INSERT INTO logs (type, data, userid, query, query_params) VALUES ('DELETE', %L, %L, %L, %L)`, `${schema}.${table}`, req.authorization.user_id, query, JSON.stringify(params)));
                break;
            }
            case "INSERT":
            {
                const query = `INSERT INTO %I.%I (${new Array(Object.keys(action.data).length).fill("%I").join(', ')}) OVERRIDING USER VALUE
                                    VALUES (${Object.values(action.data).map(value => Array.isArray(value) ? `ARRAY[%L]::text[]` : "%L")})`;
                const params = [ schema, table, ...Object.keys(action.data), ...Object.values(action.data) ];
                queries.push(TargetDatabase.format(query, ...params));
                logs.push(InternalDatabase.format(`INSERT INTO logs (type, data, userid, query, query_params) VALUES ('INSERT', %L, %L, %L, %L)`, `${schema}.${table}`, req.authorization.user_id, query, JSON.stringify(params)));
                break;
            }
            case "UPDATE":
            {
                for (const key in action.id) delete action.data[key];
                const { conditions, params: conditionsParams } = build_where(action.id);
                const query = `UPDATE %I.%I SET ${Object.values(action.data).map(value => Array.isArray(value) ? `%I = ARRAY[%L]::text[]` : "%I = %L").join(", ")} WHERE ${conditions}`;
                const params = [ schema, table, ...(Object.entries(action.data).flat()), ...conditionsParams ];
                queries.push(TargetDatabase.format(query, ...params));
                logs.push(InternalDatabase.format(`INSERT INTO logs (type, data, userid, query, query_params) VALUES ('UPDATE', %L, %L, %L, %L)`, `${schema}.${table}`, req.authorization.user_id, query, JSON.stringify(params)));
                break;
            }
        }
    }
    await TargetDatabase.query_multiple(queries);
    await InternalDatabase.query_multiple(logs);
    return res.redirect(`/table?id=${req.body.table}`);
}


import schema_templates from "./utils/schema_templates/schema_templates.js";
const EMPTY_GET_SCHEMA = { query: { type: "object", additionalProperties: false, properties: { } } };
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
            "authentication": schema_templates.authentication,
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