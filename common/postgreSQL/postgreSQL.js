import { config } from "common/index.js";

import pg from 'pg';
import format from 'pg-format';

import parse_response from "./parse_response.js";

const Connection = new pg.Pool({
    "host": config.postgreSQL.host,
    "port": config.postgreSQL.port,
    "database": config.postgreSQL.database,
    "user": config.postgreSQL.user,
    "password": config.postgreSQL.password,

    "parseInputDatesAsUTC": true,
    "application_name": config.application.name
});

export default class PostgreSQL
{
    static format(template, ...params) { return format(template, ...params); }


    #Connection;
    constructor(options) { this.#Connection = new pg.Pool({ ...options, parseInputDatesAsUTC: true, application_name: config.application.name }); }
    end() { this.#Connection.end(); }

    async query(query, params, parse = false, one_response = false)
    {
        let data = await Connection.query(query, params);
        if (parse) data.rows = parse_response(data.rows);
        if (one_response) data.rows = data.rows[0];
        return(data.rows);
    }
    async query_multiple(queries = { })
    {
        let final_query = "", plan = [ ];
        for (const key in queries)
        {
            if (typeof queries[key] !== "object") queries[key] = { "query": queries[key] };
            const info = queries[key];
            plan.push({ "name": key, "parse": info.parse ?? false, "one_response": info.one_response ?? false });
            final_query += `${info.query}${info.query.endsWith(";") ? "" : ";"}`;
        }
        if (plan.length == 0) return;
        let data = await Connection.query(final_query);
        if (!Array.isArray(data)) data = [ data ];
        let result = Array.isArray(queries) ? [ ] : { };
        for (let i = 0; i < data.length; i++)
        {
            data[i] = data[i].rows;
            if (plan[i].parse) parse_response(data[i]);
            if (plan[i].one_response) data[i] = data[i][0];
            result[plan[i].name] = data[i];
        }
        return(result);
    }
};

const TargetDatabase = new PostgreSQL(config.postgreSQL.target);
const InternalDatabase = new PostgreSQL(config.postgreSQL.internal);
export { TargetDatabase, InternalDatabase };