import { InternalDatabase } from "common/index.js";
import build_table_query from "./utils/build_table_query.js";

export default async function logs(msg, socket, req)
{
    if (!req.authorization.permissions.includes("A")) return;
    const data = await InternalDatabase.query(build_table_query(msg, `SELECT logs.*, users.login AS username FROM logs INNER JOIN users ON users.id = logs.userid `, [ ]));
    socket.send(JSON.stringify({ eventName: 'logs', data: { id: msg.id, rows: data } }));
}