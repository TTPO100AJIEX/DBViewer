import { TargetDatabase } from "common/index.js";

export default async function database_data(msg, socket, req)
{
    const [ { database_name, postgres_version, uptime, database_size }, connections_stats, stats ] = await TargetDatabase.query_multiple([
        {
            query: `SELECT current_database() AS database_name, version() AS postgres_version,
                            NOW() - pg_postmaster_start_time() AS uptime, pg_size_pretty(pg_database_size(current_database())) AS database_size`,
            one_response: true
        },
        `SELECT state, COUNT(*) AS amount FROM pg_stat_activity WHERE datname = current_database() GROUP BY state`,
        {
            query: `SELECT
                    xact_commit AS queries_success, xact_rollback AS queries_cancelled,
                    tup_returned AS reads_total, tup_fetched AS reads_index,
                    tup_inserted AS updates_inserted, tup_updated AS updates_updated, tup_deleted AS updates_deleted,
                    blks_read + blks_hit AS blocks_total, blks_hit AS blocks_cache,
                    active_time AS worktime_worktime,
                    stats_reset AS reset
                FROM pg_stat_database WHERE datname = current_database()`,
            parse: true,
            one_response: true
        }
    ]);

    socket.send(JSON.stringify({
        eventName: "database_data",
        data:
        {
            database_name,
            postgres_version,
            uptime: uptime.toPostgres(),
            database_size,
            connections:
            {
                active: connections_stats.find(data => data.state == "active")?.amount ?? 0,
                idle: connections_stats.find(data => data.state == "idle")?.amount ?? 0
            },
            ...stats
        }
    }));
}