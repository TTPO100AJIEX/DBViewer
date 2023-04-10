import { TargetDatabase } from "common/index.js";

async function get_database(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);

    const [ { current_database: databaseName }, tables ] = await TargetDatabase.query_multiple([
        { query: `SELECT current_database()`, one_response: true },
        `SELECT schemaname, tablename FROM pg_tables WHERE schemaname != 'information_schema' AND NOT starts_with(schemaname, 'pg_')`
    ]);

    return res.render("database.ejs", { databaseName, tables });
}

async function websocket_data(connection, req)
{
    console.log('!');
}

export { get_database, websocket_data };