import Chart from "/static/js/utils/chart.js";
import Table from "/static/js/utils/table.js";

Table.registerSaveButton(document.getElementById("save_changes"));
var config = undefined, charts = undefined, table = undefined, socket = new WebSocket(`wss://${location.host}/data`);
function requestData()
{
    socket.send(JSON.stringify({ requestName: "table_data", data: { id: Number(new URLSearchParams(location.search).get("id")) } }));
}
socket.addEventListener("message", message =>
{
    const msg = JSON.parse(message.data);
    switch (msg.eventName)
    {
        case "config":
        {
            config = msg.data;
            charts = {
                reads: new Chart(   document.getElementById("reads_graph"),
                                    config.graph_records,
                                    config.update_interval,
                                    "Статистика получения записей таблицы",
                                    "Количество записей",
                                    { total: "Всего", index: "По индексу" }),
                scans: new Chart(   document.getElementById("scans_graph"),
                                    config.graph_records,
                                    config.update_interval,
                                    "Количество поисков по таблице",
                                    "Количество сканирований",
                                    { sequential: "Последовательные сканирования", index: "По индексу" }),
                updates: new Chart( document.getElementById("updates_graph"),
                                    config.graph_records,
                                    config.update_interval,
                                    "Изменения записей таблицы",
                                    "Количество записей",
                                    { inserted: "Добавленных", updated: "Обновлённых", deleted: "Удалённых" }),
                live: new Chart(document.getElementById("live_graph"),
                                config.graph_records,
                                config.update_interval,
                                'Количество "живых" и "мёртвых" записей таблицы',
                                "Количество записей",
                                { live: "Живых", dead: "Мёртых" })
            };
            table = new Table(document.getElementById("data_table"), config.page_size, socket);
            requestData();
            break;
        }
        case "table_data":
        {
            document.getElementById("table_name").innerText = msg.data.table.name;
            document.getElementById("table_type").innerText = msg.data.table.type;
            document.getElementById("table_size").innerText = msg.data.table.size;
            document.getElementById("table_rows").innerText = msg.data.table.rows;
            for (const chartName in charts) charts[chartName].addRecord(msg.data[chartName]);
            setTimeout(requestData, config.update_interval);
            break;
        }
        case "table_rows": { break; }
        default:
        {
            console.warn("Websocket - unknown eventName received " + msg.eventName);
        }
    }
}, { "capture": false, "once": false, "passive": true });