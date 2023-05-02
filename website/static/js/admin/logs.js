import Table from "/static/js/utils/table.js";

var config = undefined, table = undefined;
const socket = new WebSocket(`wss://${location.host}/data`);
socket.addEventListener("message", message =>
{
    const msg = JSON.parse(message.data);
    switch (msg.eventName)
    {
        case "config":
        {
            config = msg.data;
            table = new Table(document.getElementById("logs_table"), config.page_size, socket, "logs");
            break;
        }
        case "logs": { break; }
        default:
        {
            console.warn("Websocket - unknown eventName received " + msg.eventName);
        }
    }
}, { "capture": false, "once": false, "passive": true });