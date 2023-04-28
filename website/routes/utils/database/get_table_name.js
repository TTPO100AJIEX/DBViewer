export default function get_table_name(DatabaseConnection, tableid)
{
    const queryString = `SELECT pg_namespace.nspname AS schema, pg_class.relname AS table
                        FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
                        WHERE pg_class.oid = $1`;
    return DatabaseConnection.query(queryString, [ tableid ], { one_response: true });
}