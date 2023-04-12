export default class Chart
{
    static #load = new Promise(resolve => Chart.onLoad = resolve);
    constructor(elementId, records, update_interval, title, vAxisTitle, labels = { })
    {
        this.records = records;
        this.update_interval = update_interval;
        this.title = title;
        this.vAxisTitle = vAxisTitle;
        this.labels = labels;
        Chart.#load.then(this.#drawChart.bind(this, elementId));
        window.addEventListener("resize", this.#redraw.bind(this))
    }

    #drawnResolve;
    #drawn = new Promise(resolve => this.#drawnResolve = resolve);
    #options;
    #data;
    #chart;
    async #drawChart(elementId)
    {
        const styles = getComputedStyle(document.body);
        const colors =
        {
            brand: styles.getPropertyValue("--chart-brand").replaceAll(" ", ""),
            border: styles.getPropertyValue("--chart-border").replaceAll(" ", ""),
            shadow: styles.getPropertyValue("--chart-shadow").replaceAll(" ", ""),
            text_brand: styles.getPropertyValue("--chart-text-brand").replaceAll(" ", ""),
            text_major: styles.getPropertyValue("--chart-text-major").replaceAll(" ", ""),
            text_minor: styles.getPropertyValue("--chart-text-minor").replaceAll(" ", ""),
            red: styles.getPropertyValue("--chart-red").replaceAll(" ", ""),
            yellow: styles.getPropertyValue("--chart-yellow").replaceAll(" ", ""),
            purple: styles.getPropertyValue("--chart-purple").replaceAll(" ", "")
        };
        this.#options = {
            backgroundColor: 'transparent', fontSize: 16, focusTarget: "category",
            colors: [ colors.red, colors.yellow, colors.purple ],
            hAxis:
            {
                format: 'hh:mm:ss', textStyle: { color: colors.text_minor },
                gridlines: { color: colors.border }, minorGridlines: { color: colors.shadow },
                title: "Время", titleTextStyle: { fontSize: 18, color: colors.text_brand },
                minValue: new Date(Date.now() - this.records * this.update_interval),
                slantedText: true
            },
            interpolateNulls: true,
            legend: { textStyle: { color: colors.text_major } },
            lineWidth: 3, pointSize: 0, selectionMode: 'multiple',
            title: this.title, titleTextStyle: { fontSize: 21, color: colors.text_major },
            tooltip: { textStyle: { fontSize: 16, fontName: 'unset' } },
            vAxis:
            {
                textStyle: { color: colors.text_minor },
                gridlines: { color: colors.border }, minorGridlines: { color: colors.shadow },
                title: this.vAxisTitle, titleTextStyle: { fontSize: 18, color: colors.text_brand }
            }
        };
        this.#data = new google.visualization.DataTable({ cols: [ { type: 'datetime', label: 'date' } ] });
        this.#chart = new google.visualization.LineChart(document.getElementById(elementId));
        this.#drawnResolve();
    }
    #redraw() { this.#chart.draw(this.#data, this.#options); }


    async addRecord(record)
    {
        await this.#drawn;

        Object.keys(record).filter(column => this.#data.getColumnIndex(column) == -1).forEach(column => this.#data.addColumn('number', this.labels[column] ?? column, column));
        this.#options.hAxis.minValue = new Date(Date.now() - this.records * this.update_interval);

        let row = [ new Date(), ...new Array(this.#data.getNumberOfColumns() - 1) ];
        for (const column in record) row[this.#data.getColumnIndex(column)] = Number(record[column]);
        this.#data.addRow(row);

        while (this.#data.getNumberOfRows() > 100) this.#data.removeRow(0);
        this.#redraw();
    }
};

google.charts.load('current', { 'packages': [ 'corechart' ], 'language': 'ru', callback: Chart.onLoad });