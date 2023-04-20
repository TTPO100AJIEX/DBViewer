import { PostgreSQL } from "common/index.js";

export default function build_table_query(msg, query, params)
{
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

    query += ` OFFSET %L LIMIT %L `;
    params.push(msg.offset, msg.limit);

    return PostgreSQL.format(query, ...params);
}