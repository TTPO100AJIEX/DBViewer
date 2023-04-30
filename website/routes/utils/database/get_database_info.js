export default async function get_database_info(DatabaseConnection)
{
    const [ { database_name }, tables ] = await DatabaseConnection.query_multiple([
        {
            query: `SELECT current_database() AS database_name`,
            one_response: true
        },
        {
            query: `SELECT
                        pg_class.oid AS id,
                        (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS name
                    FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
                    WHERE pg_class.relkind = 'r' AND pg_namespace.nspname != 'information_schema' AND NOT starts_with(pg_namespace.nspname, 'pg_')`
        }
    ]);
    return { database_name, tables };
}