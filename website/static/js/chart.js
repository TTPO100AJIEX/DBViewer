export default class Chart
{
    static #load = new Promise(resolve => Chart.onLoad = resolve);
    
    constructor(elementId, records, update_interval, title, vAxisTitle, labels = { })
    {
        this.records = records;
        this.update_interval = update_interval;
        this.labels = labels;

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
            chartArea: { top: '15%', height: '65%' },
            backgroundColor: 'transparent', fontSize: 16, focusTarget: "category",
            colors: [ colors.red, colors.yellow, colors.purple ],
            hAxis:
            {
                format: 'hh:mm:ss', textStyle: { color: colors.text_minor }, slantedText: true,
                gridlines: { color: colors.border }, minorGridlines: { color: colors.shadow },
                title: "Время", titleTextStyle: { fontSize: 18, color: colors.text_brand },
                minValue: new Date(Date.now() - this.records * this.update_interval),
            },
            interpolateNulls: true, lineWidth: 3, pointSize: 0, selectionMode: 'multiple',
            legend: { textStyle: { color: colors.text_major } }, tooltip: { textStyle: { fontName: 'unset' } },
            title: title, titleTextStyle: { fontSize: 21, color: colors.text_major },
            vAxis:
            {
                format: "short",
                textStyle: { color: colors.text_minor }, title: vAxisTitle, titleTextStyle: { fontSize: 18, color: colors.text_brand },
                gridlines: { color: colors.border }, minorGridlines: { color: colors.shadow }
            }
        };
        this.#adjustFontSize();
        window.addEventListener("resize", () => { this.#adjustFontSize(); this.#redraw(); });
        Chart.#load.then(this.#drawChart.bind(this, elementId));
    }
    async #adjustFontSize()
    {
        const defaultFontSize = Number(getComputedStyle(document.body).getPropertyValue("font-size").slice(0, -2));
        this.#options.fontSize = defaultFontSize - 2;
        this.#options.hAxis.titleTextStyle.fontSize = this.#options.vAxis.titleTextStyle.fontSize = defaultFontSize;
        this.#options.titleTextStyle.fontSize = defaultFontSize + 2;
    }

    #drawnResolve; #drawn = new Promise(resolve => this.#drawnResolve = resolve);
    #options; #data; #chart;
    async #drawChart(elementId)
    {
        this.#data = new google.visualization.DataTable({ cols: [ { type: 'datetime', label: 'date' } ] });
        this.#chart = new google.visualization.LineChart(document.getElementById(elementId));
        this.#drawnResolve();
    }
    #redraw() { this.#chart.draw(this.#data, this.#options); }


    async addRecord(record)
    {
        await this.#drawn;

        Object.keys(record).filter(column => this.#data.getColumnIndex(column) == -1).forEach(column => this.#data.addColumn('number', this.labels[column] ?? column, column));

        let row = [ new Date(), ...new Array(this.#data.getNumberOfColumns() - 1) ];
        for (const column in record) row[this.#data.getColumnIndex(column)] = Number(record[column]);
        this.#data.addRow(row);
        
        if (this.#options.hAxis.minValue)
        {
            const timeEstimate = new Date(Date.now() - this.records * this.update_interval);
            if (timeEstimate < this.#data.getValue(0, 0)) this.#options.hAxis.minValue = timeEstimate;
            else delete this.#options.hAxis.minValue;
        }

        while (this.#data.getNumberOfRows() > this.records) this.#data.removeRow(0);
        this.#redraw();
    }
};

google.charts.load('current', { 'packages': [ 'corechart' ], 'language': 'ru', callback: Chart.onLoad });