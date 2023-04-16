import { TargetDatabase } from "common/index.js";

export default async function get_table_rows(msg, socket)
{
    console.log(msg)
    socket.send(
        JSON.stringify({
            eventName: 'table_rows',
            data:
            {
                id: msg.id,
                rows: [ ]
            }
        })
    );
}