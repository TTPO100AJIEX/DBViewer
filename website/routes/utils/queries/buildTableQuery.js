function build_table_query_conditions(filters)
{
    let query = "", params = [ ];
    if (filters.length != 0)
    {
        query += ` WHERE ` + filters.map(filter =>{
            switch (filter.comparison)
            {
                case "exact": { params.push(filter.name, filter.value); return `%I = %L`; }
                case "substring": { params.push(filter.name, `%${filter.value}%`); return `%I::text LIKE %L`; }
            }
        }).join(' AND ');
    }
    return { query, params };
}

function build_table_query_ordering(sorts)
{
    let query = "", params = [ ];
    if (sorts.length != 0)
    {
        query += ` ORDER BY ` + sorts.map(sorting => {
            params.push(sorting.name);
            return `%I ${sorting.order == "asc" ? "asc" : "desc"}`;
        }).join(', ');
    }
    return { query, params };
}

export default function buildTableQuery(columns, table, filters, sorts, offset, limit)
{
    const { query: conditionQuery, params: conditionsParams } = build_table_query_conditions(filters);
    const { query: orderingQuery, params: orderingParams } = build_table_query_ordering(sorts);
    return {
        query: `SELECT ${columns} FROM ${table}` + conditionQuery + orderingQuery + ` OFFSET %L LIMIT %L `,
        params: [ ...conditionsParams, ...orderingParams, offset, limit ]
    };
}