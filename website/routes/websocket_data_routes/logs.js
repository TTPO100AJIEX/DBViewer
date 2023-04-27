import { InternalDatabase } from "common/postgreSQL/postgreSQL.js";

import buildTableQuery from "../utils/queries/buildTableQuery.js";

async function logs(msg, socket, req)
{
    if (!req.authorization.permissions.includes("A")) return;
    
    if (msg.sorts.length == 0) msg.sorts = [ { name: "date", order: "desc" } ];
    const { query, params } = buildTableQuery(`logs.*, users.login AS username`, "logs INNER JOIN users ON users.id = logs.userid", msg.filters, msg.sorts, msg.offset, msg.limit);
    const formatted_query = InternalDatabase.format(query, ...params);
    const rows = await InternalDatabase.query(formatted_query);
    socket.send(JSON.stringify({ eventName: 'logs', data: { id: msg.id, rows } }));
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
    { requestName: "logs", schema: SCHEMA, handler: logs }
];