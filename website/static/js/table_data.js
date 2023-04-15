import Chart from "/static/js/utils/chart.js";
import Table from "/static/js/utils/table.js";

Table.registerSaveButton(document.getElementById("save_changes"));
var config = undefined, charts = undefined, table = undefined;
const socket = new WebSocket(`wss://${location.host}/data`);
function requestData()
{
    socket.send(JSON.stringify({ method: "get", requestName: "table_data", data: { id: new URLSearchParams(location.search).get("id") } }));
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
                reads: new Chart(   "reads_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Статистика получения записей",
                                    "Количество записей",
                                    { total: "Всего", index: "По индексу" }),
                scans: new Chart(   "scans_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Сканирования таблицы",
                                    "Количество сканирований",
                                    { sequential: "Последовательные", index: "По индексу" }),
                updates: new Chart( "updates_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Изменения записей",
                                    "Количество записей",
                                    { inserted: "Добавленных", updated: "Обновлённых", deleted: "Удалённых" }),
                live: new Chart("live_graph",
                                config.graph_records,
                                config.update_interval,
                                '"Живые" и "мёртвые" записи',
                                "Количество записей",
                                { live: "Живых", dead: "Мёртых" })
            };
            table = new Table(document.getElementById("data_table"), config.group_size);
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
        default:
        {
            console.warn("Websocket - unknown eventName received " + msg.eventName);
        }
    }
});