function table_rows_query_conditions(filters)
{
    if (filters.length == 0) return { query: "", params: [ ] };
    return {
        query: `WHERE ${filters.map(filter => filter.comparison == "exact" ? `%I = %L` : `%I::text LIKE %L`).join(" AND ")}`,
        params: filters.map(filter => filter.comparison == "exact" ? [ filter.name, filter.value ] : [ filter.name, `%${filter.value}%` ]).flat()
    }
}

function table_rows_query_ordering(sorts)
{
    if (sorts.length == 0) return { query: "", params: [ ] };
    return {
        query: `ORDER BY ${sorts.map(sorting => `%I ${sorting.order == "asc" ? "asc" : "desc"}`).join(', ')}`,
        params: sorts.map(sorting => sorting.name)
    }
}

export default function table_rows_query(columns, table, filters, sorts)
{
    const { query: conditionQuery, params: conditionsParams } = table_rows_query_conditions(filters);
    const { query: orderingQuery, params: orderingParams } = table_rows_query_ordering(sorts);
    return {
        query: `SELECT ${columns} FROM ${table} ${conditionQuery} ${orderingQuery}`,
        params: [ ...conditionsParams, ...orderingParams ]
    };
}