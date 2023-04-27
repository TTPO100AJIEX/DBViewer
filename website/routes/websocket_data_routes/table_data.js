import { TargetDatabase } from "common/postgreSQL/postgreSQL.js";

const tableDataQuery = `SELECT
                            (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS table_name,
                            (CASE
                                WHEN pg_class.relkind = 'r' THEN 'table'
                                WHEN pg_class.relkind = 'v' THEN 'view'
                                WHEN pg_class.relkind = 'm' THEN 'materialized view'
                                ELSE 'unknown'
                            END) AS table_type,
                            pg_size_pretty(pg_total_relation_size(pg_class.oid)) AS table_size,
                            pg_class.reltuples AS table_rows,

                            pg_stat_user_tables.seq_tup_read + pg_stat_user_tables.idx_tup_fetch AS reads_total,
                            pg_stat_user_tables.idx_tup_fetch AS reads_index,

                            pg_stat_user_tables.seq_scan AS scans_sequential,
                            pg_stat_user_tables.idx_scan AS scans_index,

                            pg_stat_user_tables.n_tup_ins AS updates_inserted,
                            pg_stat_user_tables.n_tup_upd AS updates_updated,
                            pg_stat_user_tables.n_tup_del AS updates_deleted,

                            pg_stat_user_tables.n_live_tup AS live_live,
                            pg_stat_user_tables.n_dead_tup AS live_dead
                        FROM pg_class
                            INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
                            LEFT JOIN pg_stat_user_tables ON pg_class.oid = pg_stat_user_tables.relid
                        WHERE pg_class.oid = $1`;

async function table_data(msg, socket)
{
    socket.send(JSON.stringify({ eventName: "table_data", data: await TargetDatabase.query(tableDataQuery, [ msg.id ], { parse: true, one_response: true }) }));
}

const SCHEMA = { additionalProperties: false, properties: { id: { type: "int32" } } };
export default [
    { requestName: "table_data", schema: SCHEMA, handler: table_data }
];