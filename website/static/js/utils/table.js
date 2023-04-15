class TableRow
{
    constructor(template)
    {
        const clone = template.content.cloneNode(true);
        this.elements = Array.from(clone.children);
        
        this.deleteButton = clone.querySelector("[data-identity] button");
        
        this.changeHandler = this.changed.bind(this);
        this.inputs.forEach(input => input.addEventListener('input', this.changeHandler, { "capture": false, "once": true, "passive": true }));
    }
    get inputs() { return this.elements.reduce((prev, cur) => prev.concat(Array.from(cur.querySelectorAll("[name]"))), [ ]); }
    
    #changeCallbacks = [ ];
    addChangeCallback(callback) { this.#changeCallbacks.push(callback); }
    removeChangeCallback(callback) { this.#changeCallbacks = this.#changeCallbacks.filter(cb => cb != callback); }
    changed(ev) { this.#changeCallbacks.forEach(callback => callback(ev.currentTarget)); }
    
    /*getData()
    {
        return Object.fromEntries(this.inputs.map(input =>
        {
            switch (input.tagName)
            {
                case "SPAN": return [ input.getAttribute("name"), input.innerText ];
                case "INPUT":
                {
                    if (input.type == "checkbox") return [ input.name, input.checked ];
                }
                default: return [ input.name, input.value ];
            }
        }));
    }*/
};
class TableInsertRow extends TableRow
{
    constructor(template) { super(template); }

    #removeCallbacks = [ ];
    addRemoveCallback(callback) { this.#removeCallbacks.push(callback); }
    removeRemoveCallback(callback) { this.#removeCallbacks = this.#removeCallbacks.filter(cb => cb != callback); }
    removed() { this.#removeCallbacks.forEach(callback => callback(this)); }
    
    showDeleteButton()
    {
        this.deleteButton.addEventListener("click", this.removed.bind(this), { "capture": false, "once": true, "passive": true });
        this.deleteButton.hidden = false;
    }
};
class TableDisplayRow extends TableRow
{
    /*constructor(data, clone)
    {
        super(clone); this.deleted = this.edited = false; this.fillData(data);
        this.deleteButton.addEventListener("click", this.remove.bind(this), { "capture": false, "once": false, "passive": true });
    }

    fillData(data)
    {
        for (const key in data)
        {
            if (data[key] == undefined) continue;
            let input = this.inputs.find(input => input.getAttribute("name") == key);
            if (!input) continue;
            switch (input.tagName)
            {
                case "SPAN": { input.innerText = data[key]; break; }
                case "INPUT":
                {
                    if (input.type == "date")
                    {
                        data[key] = new Date(data[key]);
                        input.value = `${data[key].getFullYear()}-${toLength(data[key].getMonth() + 1, 2, "0")}-${toLength(data[key].getDate(), 2, "0")}`;
                        break;
                    }
                    if (input.type == "checkbox")
                    {
                        input.checked = data[key];
                        break;
                    }
                }
                default: { input.value = data[key] ?? ''; break; }
            }
        }
    }

    changed()
    {
        if (this.ignoreChangeEvents) return;
        this.elements.forEach(row => row.dataset.edited = true);
        this.edited = true;
    }
    remove()
    {
        if (this.deleted) { this.elements.forEach(row => row.dataset.deleted = false); this.deleteButton.innerText = "➖"; }
        else { this.elements.forEach(row => row.dataset.deleted = true); this.deleteButton.innerText = "➕"; }
        this.deleted = !this.deleted;
    }*/
};


export default class Table
{
    static #tables = [ ];
    static registerSaveButton(button)
    {
        button.addEventListener("submit", ev =>
        {
            ev.preventDefault();
            //ev.currentTarget.elements.actions.value = JSON.stringify(Table.tables.reduce((prev, cur) => prev.concat(cur.getUpdateActions()), [ ]));
            //Table.tables.forEach(table => table.saveExtraData(ev.currentTarget));
            //ev.currentTarget.submit();
        }, { "capture": false, "once": false, "passive": false });
    }


    #group_size;
    #table; #head; #insertBody; #displayBody;
    #insertRow; #displayRow;
    #displayObserver;
    constructor(table, group_size)
    {
        this.#group_size = group_size;
        
        this.#table = table;
        this.#head = table.querySelector("thead");
        this.#insertBody = table.querySelector("tbody[data-type=insert]");
        this.#displayBody = table.querySelector("tbody[data-type=display]");
        
        let rowTemplate = table.querySelector("[data-type=row]"); rowTemplate.remove();

        let insertIdentityColumn = rowTemplate.content.querySelector("[data-type=insert]");
        insertIdentityColumn.parentElement.dataset.identity = true
        insertIdentityColumn.remove();

        let displayIdentityColumn = rowTemplate.content.querySelector("template[data-type=display]");
        displayIdentityColumn.parentElement.dataset.identity = true
        displayIdentityColumn.remove();

        let insertTemplate = rowTemplate.cloneNode(true), displayTemplate = rowTemplate.cloneNode(true);
        insertTemplate.content.querySelector("[data-identity]").append(insertIdentityColumn.content.cloneNode(true));
        displayTemplate.content.querySelector("[data-identity]").append(displayIdentityColumn.content.cloneNode(true));

        this.#insertRow = class InsertRow extends TableInsertRow
        {
            constructor() { super(insertTemplate); }
        };
        this.#displayRow = class DisplayRow extends TableDisplayRow
        {
            constructor(data) { super(data, displayTemplate); }
        };

        // this.#displayObserver = new IntersectionObserver(entries => { if (entries[0].isIntersecting) this.loadNextPage() }, { "rootMargin": "0px", "threshold": 0 });
        
        this.#setupHead(); this.#setupInsert(); this.#setupDisplay();

        Table.#tables.push(this);
    }

    
    #setupHead()
    {
        Array.from(this.#head.querySelectorAll("input, select, textarea")).forEach(input =>
        {
            input.addEventListener("change", this.#setupDisplay.bind(this), { "capture": false, "once": false, "passive": true });
        });
    }
    /*getFilters()
    {
        let filters = [ ];
        for (const th of this.table.children[0].children[0].children)
        {
            if (th.children.length == 0) continue;
            const filterElement = th.children[1].children[0];
            if (filterElement.value) filters.push({ name: filterElement.dataset.column, value: filterElement.value, comparison: filterElement.dataset.comparison });
        }
        return filters;
    }
    getSorts()
    {
        let sorts = [ ];
        for (const th of this.table.children[0].children[0].children)
        {
            if (th.children.length == 0) continue;
            const sortElement = th.children[1].children[1];
            if (sortElement.value != "no") sorts.push({ name: sortElement.dataset.column, order: sortElement.value });
        }
        return sorts;
    }*/


    #insertRows = [ ];
    #addInsertRowCallback = this.#addInsertRow.bind(this);
    #addInsertRow()
    {
        if (this.#insertRows.length != 0)
        {
            this.#insertRows.at(-1).removeChangeCallback(this.#addInsertRowCallback);
            this.#insertRows.at(-1).addRemoveCallback(this.#removeInsertRow.bind(this));
            this.#insertRows.at(-1).showDeleteButton();
        }

        this.#insertRows.push(new this.#insertRow());
        this.#insertRows.at(-1).addChangeCallback(this.#addInsertRowCallback);
        this.#insertBody.append(...this.#insertRows.at(-1).elements);
    }
    #removeInsertRow(row) { row.elements.forEach(row => row.remove()); this.#insertRows = this.#insertRows.filter(r => r != row); }
    #setupInsert() { this.#addInsertRow(); }

    
    /*async getDisplayData()
    {
        return await (await fetch(`/data?` + new URLSearchParams({ table: this.tablename, offset: this.displayBody.children.length, filters: JSON.stringify(this.getFilters()), sorts: JSON.stringify(this.getSorts()) }), { ...DefaultFetchOptions, method: "GET" })).json();
    }
    renderData(data)
    {
        for (const row of data)
        {
            this.displayRows.push(new this.rowServer.displayRow(row));
            this.displayBody.append(...this.displayRows.at(-1).elements);
        }
    }
    async loadNextPage()
    {
        this.displayObserver.disconnect();
        const data = await this.getDisplayData();
        this.renderData(data);
        if (this.displayBody.lastElementChild && data.length % 50 == 0) this.displayObserver.observe(this.displayBody.lastElementChild);
    }*/
    #setupDisplay()
    {
        /*Array.from(this.displayBody.children).forEach(row => row.remove());
        this.displayRows = [ ]; this.loadNextPage();*/
    }


    /*getUpdateActions()
    {
        let actions = [ ];
        this.insertRows.slice(0, -1).forEach(row => actions.push({ type: "INSERT", data: row.getData() }));
        this.displayRows.filter(row => row.deleted).forEach(row => actions.push({ type: "DELETE", id: row.getData().id }));
        this.displayRows.filter(row => row.edited && !row.deleted).forEach(row => actions.push({ type: "UPDATE", data: row.getData() }));
        return actions;
    }
    saveExtraData(form) { }*/
};