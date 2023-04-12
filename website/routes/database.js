import { TargetDatabase, config } from "common/index.js";

async function get_database(req, res)
{
    if (!req.authorization.permissions.includes("R")) return res.error(403);

    const [ { current_database: databaseName }, tables ] = await TargetDatabase.query_multiple([
        { query: `SELECT current_database()`, one_response: true },
        `SELECT schemaname, tablename FROM pg_tables WHERE schemaname != 'information_schema' AND NOT starts_with(schemaname, 'pg_')`
    ]);
    
    if (req.routerPath == "/database") return res.render("database.ejs", { databaseName, tables });
    else return res.render("table.ejs", { databaseName, tables });
}


import get_database_data from "./data/database_data.js";

async function websocket_data(connection, req)
{
    const handlers = {
        database_data:
        {
            get: get_database_data
        }
    };

    connection.socket.on("message", message =>
    {
        const msg = JSON.parse(message.toString());
        handlers[msg.requestName][msg.method](msg.data, connection.socket);
    });

    connection.socket.send(JSON.stringify({
        eventName: "config",
        data: { graph_records: config.graph_records, group_size: config.group_size, update_interval: config.update_interval }
    }));
}

export { get_database, websocket_data };