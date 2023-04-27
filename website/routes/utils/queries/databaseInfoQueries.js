export default function databaseInfoQueries()
{
    return [
        { query: `SELECT current_database() AS database_name`, one_response: true },

        `SELECT
            pg_class.oid AS id,
            (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS name
        FROM pg_class
            INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE (pg_class.relkind = 'r' OR pg_class.relkind = 'v' OR pg_class.relkind = 'm') AND
                pg_namespace.nspname != 'information_schema' AND NOT starts_with(pg_namespace.nspname, 'pg_')`
    ];
}