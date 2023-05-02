import { InternalDatabase } from "common/postgreSQL/postgreSQL.js";

import table_rows_query from "./utils/table_rows_query.js";

async function logs(msg, socket, req)
{
    if (!req.authorization.permissions.includes("A")) return;
    if (msg.sorts.length == 0) msg.sorts = [ { name: "date", order: "desc" } ];
    const { query, params } = table_rows_query(`logs.*, users.login AS username`, "logs INNER JOIN users ON users.id = logs.userid", msg.filters, msg.sorts);
    const queryString = InternalDatabase.format(query, ...params);

    if (socket.logs_message_cursor?.query != queryString)
    {
        if (socket.logs_message_callback)
        {
            socket.removeListener('close', socket.logs_message_callback);
            await socket.logs_message_callback();
        }

        socket.logs_message_cursor = await InternalDatabase.cursor(queryString);
        socket.logs_message_callback = async () => await socket.logs_message_cursor.end();
        socket.on('close', socket.logs_message_callback);
    }
    
    socket.send(JSON.stringify({ eventName: 'logs', data: await socket.logs_message_cursor.get(msg.limit) }));
}


const SCHEMA = {
    additionalProperties: false,
    properties:
    {
        limit: { type: "int32" },
        filters:
        {
            elements:
            {
                additionalProperties: false,
                properties:
                {
                    name: { type: "string" },
                    value: { type: "string" },
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
    },
    optionalProperties:
    {
        tableid: { type: "int32" }
    }
};
export default [
    { requestName: "logs", schema: SCHEMA, handler: logs }
];