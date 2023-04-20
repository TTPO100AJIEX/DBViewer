import { InternalDatabase, TargetDatabase, Utils } from "common/index.js";
import build_table_query from "./utils/build_table_query.js";

function transform_data(data)
{
    if (typeof data != 'object') return data;
    if (data instanceof Utils.Interval) return data.toPostgres();
    
    for (const key in data) data[key] = transform_data(data[key]);
    return data;
}

export default async function table_rows(msg, socket, req)
{
    if (!req.authorization.permissions.includes("R")) return;
    
    const { schema, table } = await TargetDatabase.query(`SELECT pg_namespace.nspname AS schema, pg_class.relname AS table FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE pg_class.oid = $1`, [ msg.tableid ], false, true);
    
    const query = build_table_query(msg, `SELECT * FROM %I.%I `, [ schema, table ]);
    const rows = transform_data(await TargetDatabase.query(query));
    await InternalDatabase.query(`INSERT INTO logs (type, data, userid, query) VALUES ('SELECT', $1, $2, $3)`, [ `${schema}.${table}[${msg.offset} - ${msg.offset + msg.limit}]`, req.authorization.user_id, query ]);

    socket.send(JSON.stringify({ eventName: 'table_rows', data: { id: msg.id, rows } }));
}