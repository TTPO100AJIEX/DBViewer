import Chart from "/static/js/chart.js";

var config = undefined, charts = undefined;
const socket = new WebSocket(`wss://${location.host}/data`);
function requestData()
{
    socket.send(JSON.stringify({ method: "get", requestName: "database_data" }));
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
                connections: new Chart( "connections_graph",
                                        config.graph_records,
                                        config.update_interval,
                                        "Соединения",
                                        "Количество соединений",
                                        { active: "Активные", idle: "Бездействующие" }),
                queries: new Chart( "queries_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Успешные и отменённые запросы",
                                    "Количество запросов",
                                    { success: "Успешные", cancelled: "Отменённые" }),
                reads: new Chart(   "reads_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Статистика получения записей",
                                    "Количество записей",
                                    { total: "Всего", index: "По индексу" }),
                updates: new Chart( "updates_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Изменения записей",
                                    "Количество записей",
                                    { inserted: "Добавленных", updated: "Обновлённых", deleted: "Удалённых" }),
                blocks: new Chart(  "blocks_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Обращения к диску",
                                    "Количество обращений",
                                    { total: "Всего", cache: '"Кэш"' }),
                worktime: new Chart("worktime_graph",
                                    config.graph_records,
                                    config.update_interval,
                                    "Время исполнения запросов",
                                    "Время (ms)",
                                    { worktime: "Время исполнения запросов" })
            };
            requestData();
            break;
        }
        case "database_data":
        {
            document.getElementById("database_name").innerText = msg.data.database_name;
            document.getElementById("postgres_version").innerText = msg.data.postgres_version;
            document.getElementById("uptime").innerText = msg.data.uptime;
            document.getElementById("database_size").innerText = msg.data.database_size;
            document.getElementById("stats_reset").innerText = msg.data.reset || "Никогда";
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