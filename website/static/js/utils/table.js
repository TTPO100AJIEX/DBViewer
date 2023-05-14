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
    
    getData()
    {
        function getInputPair(input)
        {
            if (input.type == "checkbox") return [ input.name, input.checked ? "t" : "f"];
            if (input.type == "time" || input.type == "datetime-local") return [ input.name, new Date(input.value) ];
            return [ input.name, input.value ];
        }
        return Object.fromEntries(this.inputs.filter(input => (input.type == 'checkbox' ? `${input.checked}` : input.value) != input.dataset.initial_value).map(getInputPair));
    }
    getInitialData() { return Object.fromEntries(this.inputs.map(input => [ input.name, input.dataset.initial_value ])); }
    getIdentifier(head)
    {
        let keys = Array.from(head.children[0].children).filter(th => (th.children?.[0]?.children?.[1]?.innerText ?? '').includes("[PK]")).map(th => th.children[0].children[0].innerText);
        if (keys.length == 0) keys = Array.from(head.children[0].children).filter(th => (th.children?.[0]?.children?.[1]?.innerText ?? '').includes("[U]")).map(th => th.children[0].children[0].innerText);
        if (keys.length == 0) return this.getInitialData();

        let data = this.getInitialData();
        for (const key in data)
        {
            if (!keys.includes(key)) delete data[key];
        }
        return data;
    }
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
        if (!this.deleteButton) return;
        this.deleteButton.addEventListener("click", this.removed.bind(this), { "capture": false, "once": true, "passive": true });
        this.deleteButton.hidden = false;
        Table.showSaveButton();
    }
};
class TableDisplayRow extends TableRow
{
    constructor(template, data)
    {
        super(template); this.deleted = this.edited = false; this.#fillData(data);
        if (this.deleteButton) this.deleteButton.addEventListener("click", this.remove.bind(this), { "capture": false, "once": false, "passive": true });
    }

    #fillData(data)
    {
        for (const input of this.inputs)
        {
            const key = input.getAttribute("name"); data[key] ??= "";
            generalSwitch: switch (input.tagName)
            {
                case "INPUT":
                {
                    switch (input.type)
                    {
                        case "date":
                        {
                            if (!data[key]) break generalSwitch;
                            data[key] = new Date(data[key]);
                            const value = `${data[key].getFullYear()}-${toLength(data[key].getMonth() + 1, 2, "0")}-${toLength(data[key].getDate(), 2, "0")}`;
                            input.value = value;
                            break generalSwitch;
                        }
                        case "time":
                        {
                            if (!data[key]) break generalSwitch;
                            data[key] = new Date(data[key]);
                            data[key] = new Date(data[key].getTime() - data[key].getTimezoneOffset() * 60 * 1000);
                            const value = `${data[key].getHours()}:${data[key].getMinutes()}`;
                            input.value = value;
                            break generalSwitch;
                        }
                        case "datetime-local":
                        {
                            if (!data[key]) break generalSwitch;
                            data[key] = new Date(data[key]);
                            data[key] = new Date(data[key].getTime() - data[key].getTimezoneOffset() * 60 * 1000);
                            const value = data[key].toISOString().substring(0, data[key].toISOString().indexOf("T") + 6);
                            input.value = value;
                            break generalSwitch;
                        }
                        case "checkbox":
                        {
                            input.checked = data[key];
                            input.value = input.checked;
                            break generalSwitch;
                        }
                    }
                }
                default:
                {
                    const value = (typeof data[key] == 'object' ? JSON.stringify(data[key]) : data[key]);
                    input.value = value;
                }
            }
            input.dataset.initial_value = input.value;
        }
    }

    changed()
    {
        super.changed();
        this.elements.forEach(row => row.dataset.edited = true);
        this.edited = true;
        Table.showSaveButton();
    }
    remove()
    {
        if (this.deleted)
        {
            this.elements.forEach(row => delete row.dataset.deleted);
            this.deleteButton.label = "Удалить строку";
            this.deleteButton.classList.remove("cross_button");
            this.deleteButton.classList.add("striped_button");
        }
        else
        {
            this.elements.forEach(row => row.dataset.deleted = true);
            this.deleteButton.label = "Вернуть строку";
            this.deleteButton.classList.add("cross_button");
            this.deleteButton.classList.remove("striped_button");
        }
        this.deleted = !this.deleted;
        Table.showSaveButton();
    }
};


export default class Table
{
    static #tables = [ ];
    static #saveButton;
    static registerSaveButton(button)
    {
        Table.#saveButton = button;
        button.form.addEventListener("submit", ev =>
        {
            ev.preventDefault();
            ev.currentTarget.elements.actions.value = JSON.stringify(Table.#tables.reduce((acc, cur) => acc.concat(cur.getUpdateActions()), [ ]));
            ev.currentTarget.submit();
        }, { "capture": false, "once": false, "passive": false });
    }
    static showSaveButton() { this.#saveButton.hidden = false; }


    #page_size;
    #table; #head; #insertBody; #displayBody;
    #insertRow; #displayRow;
    constructor(table, page_size, socket, socketEventName = "table_rows")
    {
        this.#page_size = page_size;
        this.socket = socket;
        this.socketEventName = socketEventName;
        
        this.#table = table;
        this.#head = table.querySelector("thead");
        this.#insertBody = table.querySelector("tbody[data-type=insert]");
        this.#displayBody = table.querySelector("tbody[data-type=display]");
        
        
        let rowTemplate = table.querySelector("[data-type=row]"); rowTemplate.remove();

        let insertIdentityColumn = rowTemplate.content.querySelector("[data-type=insert]");
        if (insertIdentityColumn) { insertIdentityColumn.parentElement.dataset.identity = true; insertIdentityColumn.remove(); }

        let displayIdentityColumn = rowTemplate.content.querySelector("template[data-type=display]");
        if (displayIdentityColumn) { displayIdentityColumn.parentElement.dataset.identity = true; displayIdentityColumn.remove(); }

        let insertTemplate = rowTemplate.cloneNode(true), displayTemplate = rowTemplate.cloneNode(true);
        if (insertIdentityColumn) insertTemplate.content.querySelector("[data-identity]").append(insertIdentityColumn.content.cloneNode(true));
        if (displayIdentityColumn) displayTemplate.content.querySelector("[data-identity]").append(displayIdentityColumn.content.cloneNode(true));

        this.#insertRow = class InsertRow extends TableInsertRow
        {
            constructor() { super(insertTemplate); }
        };
        this.#displayRow = class DisplayRow extends TableDisplayRow
        {
            constructor(data) { super(displayTemplate, data); }
        };

        this.#setupHead();
        this.#setupInsert();
        this.#setupDisplay();
        Table.#tables.push(this);
    }

    
    #setupHead()
    {
        Array.from(this.#head.querySelectorAll("input, select, textarea")).forEach(input =>
        {
            input.addEventListener("change", this.#setupDisplay.bind(this), { "capture": false, "once": false, "passive": true });
        });
    }
    #getFilters()
    {
        return Array.from(this.#head.querySelectorAll(":is(input, select, textarea):not(.sortOrder)"))
                .filter(input => input.value)
                .map(input => ({ name: input.dataset.column, value: input.value, comparison: input.dataset.comparison }));
    }
    #getSorts()
    {
        let sorts = Array.from(this.#head.querySelectorAll(".sortOrder")).filter(select => select.value !== "default").map(select => ({ name: select.dataset.column, order: select.value }));
        if (sorts.length == 0)
        {
            sorts = Array.from(this.#head.children[0].children)
                    .filter(th => (th.children?.[0]?.children?.[1]?.innerText ?? '').includes("[PK]"))
                    .map(th => ({ name: th.children[0].children[0].innerText, order: 'default' }));
        }
        if (sorts.length == 0)
        {
            sorts = Array.from(this.#head.children[0].children)
                    .filter(th => (th.children?.[0]?.children?.[1]?.innerText ?? '').includes("[U]"))
                    .map(th => ({ name: th.children[0].children[0].innerText, order: 'default' }));
        }
        return sorts;
    }


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
    #setupInsert() { if (this.#insertBody) this.#addInsertRow(); }

    
    #displayRows = [];
    #displayObserver;
    #getNextPageData()
    {
        return new Promise(resolve =>
        {
            const socketListener = (message) => {
                const msg = JSON.parse(message.data);
                if (msg.eventName == this.socketEventName)
                {
                    resolve(msg.data);
                    this.socket.removeEventListener("message", socketListener, { "capture": false, "once": false, "passive": true });
                }
            };
            this.socket.addEventListener("message", socketListener, { "capture": false, "once": false, "passive": true });
            this.socket.send(JSON.stringify({
                requestName: this.socketEventName,
                data: {
                    tableid: Number(this.#table.dataset.tableid),
                    limit: this.#page_size,
                    filters: this.#getFilters(),
                    sorts: this.#getSorts()
                }
            }));
        });
    }
    #renderData(data)
    {
        for (const row of data)
        {
            this.#displayRows.push(new this.#displayRow(row));
            const identityCell = this.#displayRows.at(-1).elements.map(e => e.querySelector("[data-identity]")).filter(e => e)[0];
            if (identityCell) identityCell.children[0].children[1].innerText = this.#displayRows.length;
            this.#displayBody.append(...this.#displayRows.at(-1).elements);
        }
    } 
    async #loadNextPage()
    {
        this.#displayObserver.disconnect();
        const data = await this.#getNextPageData();
        this.#renderData(data);
        if (this.#displayBody.lastElementChild && data.length == this.#page_size) this.#displayObserver.observe(this.#displayBody.lastElementChild);
    }
    #setupDisplay()
    {
        if (this.#displayObserver) this.#displayObserver.disconnect();
        else this.#displayObserver = new IntersectionObserver(entries => { if (entries[0].isIntersecting) this.#loadNextPage() }, { rootMargin: "0px", threshold: 0 });
        Array.from(this.#displayBody.children).forEach(row => row.remove());
        this.#displayRows = [ ];
        this.#loadNextPage();
    }


    getUpdateActions()
    {
        return [
            ...this.#insertRows.slice(0, -1).map(row => ({ type: "INSERT", data: row.getData() })),
            ...this.#displayRows.filter(row => row.deleted).map(row => ({ type: "DELETE", id: row.getIdentifier(this.#head) })),
            ...this.#displayRows.filter(row => row.edited && !row.deleted).map(row => ({ type: "UPDATE", data: row.getData(), id: row.getIdentifier(this.#head) }))
        ];
    }
};