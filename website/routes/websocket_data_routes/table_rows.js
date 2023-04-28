import Utils from "common/utils/Utils.js";
import { TargetDatabase, InternalDatabase } from "common/postgreSQL/postgreSQL.js";

import get_table_name from "../utils/database/get_table_name.js";
import table_rows_query from "./utils/table_rows_query.js";

function transform_data(data)
{
    if (typeof data != 'object') return data;
    if (data instanceof Utils.Interval) return data.toPostgres();
    
    for (const key in data) data[key] = transform_data(data[key]);
    return data;
}

async function table_rows(msg, socket, req)
{
    if (!req.authorization.permissions.includes("R")) return;
    const { schema, table } = await get_table_name(TargetDatabase, msg.tableid);
    
    const { query, params } = table_rows_query(`*`, "%I.%I", msg.filters, msg.sorts, msg.offset, msg.limit);
    const rows = transform_data(await TargetDatabase.query(TargetDatabase.format(query, schema, table, ...params)));
    
    await InternalDatabase.query(`INSERT INTO logs (type, data, userid, query, query_params) VALUES ('SELECT', $1, $2, $3, $4)`,
            [ `${schema}.${table}[${msg.offset} - ${msg.offset + msg.limit}]`, req.authorization.user_id, query, JSON.stringify([ schema, table, ...params ]) ]);
    socket.send(JSON.stringify({ eventName: 'table_rows', data: { id: msg.id, rows } }));
}


const SCHEMA = {
    additionalProperties: false,
    properties:
    {
        id: { type: "string" },
        tableid: { type: "int32" },
        offset: { type: "int32" },
        limit: { type: "int32" },
        filters:
        {
            elements:
            {
                additionalProperties: false,
                properties:
                {
                    name: { type: "string" },
                    value: { },
                    comparison: { enum: [ "exact", "substring" ] }
                }
            }
        },
        sorts:
        {
            elements:
            {
                additionalProperties: false,
                properties:
                {
                    name: { type: "string" },
                    order: { enum: [ "asc", "desc" ] }
                }
            }
        },

    }
};
export default [
    { requestName: "table_rows", schema: SCHEMA, handler: table_rows }
];