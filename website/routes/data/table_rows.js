import { PostgreSQL, TargetDatabase } from "common/index.js";

export default async function table_rows(msg, socket)
{
    const { schema, table } = await TargetDatabase.query(`SELECT pg_namespace.nspname AS schema, pg_class.relname AS table
            FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE pg_class.oid = $1`, [ msg.tableid ], false, true);
    
    let query = `SELECT * FROM %I.%I `, params = [ schema, table ];

    if (msg.filters.length != 0)
    {
        query += ` WHERE ` + msg.filters.map(filter => {
            switch (filter.comparison)
            {
                case "exact": { params.push(filter.name, filter.value); return `%I = %L`; }
                case "substring": { params.push(filter.name, `%${filter.value}%`); return `%I::text LIKE %L`; }
            }
        }).join(' AND ');
    }

    if (msg.sorts.length != 0)
    {
        query += ` ORDER BY ` + msg.sorts.map(sorting => {
            params.push(sorting.name);
            return `%I ${sorting.order == "asc" ? "asc" : "desc"}`;
        }).join(', ');
    }

    query += ` OFFSET %L LIMIT %L `; params.push(msg.offset, msg.limit);

    socket.send(
        JSON.stringify({
            eventName: 'table_rows',
            data:
            {
                id: msg.id,
                rows: await TargetDatabase.query(PostgreSQL.format(query, ...params))
            }
        })
    );
}