import config from "common/configs/config.js";
import Utils from "common/utils/Utils.js";

import pg from 'pg';
import format from 'pg-format';
pg.types.setTypeParser(pg.types.builtins.INTERVAL, value => new Utils.Interval(value));

import Cursor from "pg-cursor";
class PostgreSQLCursor
{
    #client; #cursor;
    constructor(client, query, params = [ ], parser = (data) => data)
    {
        this.#client = client;
        this.query = query;
        this.params = params;
        this.parser = parser;
        this.#cursor = client.query(new Cursor(query, params));
    }
    async get(maxRows)
    {
        const data = this.parser(await this.#cursor.read(maxRows));
        return (maxRows == 1) ? data[0] : data;
    }
    async end()
    {
        await this.#cursor.close();
        this.#client.release();
    }
};

export default class PostgreSQL
{
    static format = format;
    format = PostgreSQL.format;


    #Connection;
    static #DefaultPostgresOptions = { parseInputDatesAsUTC: true, application_name: config.application };
    constructor(options) { this.#Connection = new pg.Pool({ ...PostgreSQL.#DefaultPostgresOptions, ...options }); }
    end() { this.#Connection.end(); }
    get_raw() { return this.#Connection; }


    #parse_response(rows)
    {
        for (const key in rows[0])
        {
            const path = key.split('_');
            if (path.length == 1) continue;
            for (let obj of rows)
            {
                const save = obj[key]; delete obj[key];
                Utils.set_field_at_path(obj, path, save);
            }
        }
        return(rows);
    }
    async query(query, params, { parse = false, one_response = false } = { })
    {
        let data = await this.#Connection.query(query, params);
        if (parse) data.rows = this.#parse_response(data.rows);
        if (one_response) data.rows = data.rows[0];
        return(data.rows);
    }
    async query_multiple(queries = { })
    {
        let final_query = "", plan = [ ];
        for (const key in queries)
        {
            const info = (typeof queries[key] !== "object") ? { query: queries[key] } : queries[key];
            plan.push({ name: key, parse: info.parse ?? false, one_response: info.one_response ?? false });
            final_query += `${info.query}${info.query.endsWith(";") ? "" : ";"}`;
        }
        if (plan.length == 0) return { };
        
        let data = await this.#Connection.query(final_query);
        if (!Array.isArray(data)) data = [ data ];
        let result = Array.isArray(queries) ? [ ] : { };
        for (let i = 0; i < data.length; i++)
        {
            data[i] = data[i].rows;
            if (plan[i].parse) this.#parse_response(data[i]);
            if (plan[i].one_response) data[i] = data[i][0];
            result[plan[i].name] = data[i];
        }
        return(result);
    }

    async cursor(query, params, { parse = false } = { })
    {
        return new PostgreSQLCursor(await this.#Connection.connect(), query, params, parse ? this.#parse_response.bind(this) : undefined);
    }
};

const TargetDatabase = new PostgreSQL(config.postgreSQL.target);
const InternalDatabase = new PostgreSQL(config.postgreSQL.internal);
export { TargetDatabase, InternalDatabase };