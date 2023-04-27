import bcrypt from 'bcrypt';
import config from 'common/configs/config.js';
import { InternalDatabase, TargetDatabase } from 'common/postgreSQL/postgreSQL.js';
import databaseInfoQueries from './utils/queries/databaseInfoQueries.js';
import tableLayoutQuerySrc from './utils/queries/tableLayoutQuerySrc.js';

async function get_admin_accounts(req, res)
{
    if (!req.authorization.permissions.includes("A")) return res.error(403);
    const [ { database_name }, tables ] = await TargetDatabase.query_multiple(databaseInfoQueries());
    const accounts = await InternalDatabase.query(`SELECT id, login, permissions FROM users ORDER BY id ASC`);
    return res.render("admin/accounts.ejs", { database_name, tables, accounts });
}
async function delete_admin_accounts(req, res)
{
    if (!req.authorization.permissions.includes("A")) return res.error(403);
    await InternalDatabase.query(`DELETE FROM users WHERE id = $1`, [ req.body.id ]);
    return res.redirect("/admin/accounts");
}
async function create_admin_accounts(req, res)
{
    if (!req.authorization.permissions.includes("A")) return res.error(403);
    const permissions = [ "R", "I", "U", "D", "A"].map(permission => (req.body.permissions ?? [ ]).includes(permission));
    const password = await bcrypt.hash(req.body.password, config.bcrypt.saltRounds);
    await InternalDatabase.query(`INSERT INTO users (login, password, read, insert, update, delete, admin) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [ req.body.login, password, ...permissions ]);
    return res.redirect("/admin/accounts");
}
async function edit_admin_accounts(req, res)
{
    if (!req.authorization.permissions.includes("A")) return res.error(403);
    const permissions = [ "R", "I", "U", "D", "A"].map(permission => (req.body.permissions ?? [ ]).includes(permission));
    if (req.body.password)
    {
        const password = await bcrypt.hash(req.body.password, config.bcrypt.saltRounds);
        await InternalDatabase.query(`UPDATE users SET (login, password, read, insert, update, delete, admin) = ($1, $2, $3, $4, $5, $6, $7) WHERE id = $8`, [ req.body.login, password, ...permissions, req.body.id ]);
    }
    else
    {
        await InternalDatabase.query(`UPDATE users SET (login, read, insert, update, delete, admin) = ($1, $2, $3, $4, $5, $6) WHERE id = $7`, [ req.body.login, ...permissions, req.body.id ]);
    }
    return res.redirect("/admin/accounts");
}


async function get_admin_logs(req, res)
{
    if (!req.authorization.permissions.includes("A")) return res.error(403);
    const [ { database_name }, tables ] = await TargetDatabase.query_multiple(databaseInfoQueries());
    const logsColumns = await InternalDatabase.query(InternalDatabase.format(tableLayoutQuerySrc("name"), 'logs'), [ ], { parse: true });
    const columns = [
        {
            label: 'Тип',
            ...logsColumns.find(column => column.name == 'type')
        },
        {
            label: 'Элементы БД',
            ...logsColumns.find(column => column.name == 'data')
        },
        {
            label: 'Пользователь',
            name: 'username',
            type: { id: 1043, mod: 104 }
        },
        {
            label: 'SQL-запрос',
            ...logsColumns.find(column => column.name == 'query')
        },
        {
            label: 'Параметры запроса',
            ...logsColumns.find(column => column.name == 'query_params')
        },
        {
            label: 'Дата',
            ...logsColumns.find(column => column.name == 'date')
        }
    ];

    return res.render("admin/logs.ejs", { database_name, tables, columns });
}

export { get_admin_accounts, delete_admin_accounts, create_admin_accounts, edit_admin_accounts, get_admin_logs };


import schema_templates from "./utils/schema_templates/schema_templates.js";
const EMPTY_GET_SCHEMA = { query: { type: "object", additionalProperties: false, properties: { } } };
const ACCOUNTS_DELETE_SCHEMA =
{
    body:
    {
        type: "object",
        required: [ "authentication", "id" ],
        additionalProperties: false,
        properties:
        {
            "authentication": schema_templates.authentication,
            "id": schema_templates.uinteger
        }
    }
};
const ACCOUNTS_CREATE_SCHEMA =
{
    body:
    {
        type: "object",
        required: [ "authentication", "login", "password" ],
        additionalProperties: false,
        properties:
        {
            "authentication": schema_templates.authentication,
            "login": { type: "string", minLength: 1, maxLength: 100 },
            "password": { type: "string", minLength: 1 },
            "permissions": { type: "array", maxItems: 5, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 1, enum: [ "R", "I", "U", "D", "A" ] } },
        }
    }
};
const ACCOUNTS_EDIT_SCHEMA =
{
    body:
    {
        type: "object",
        required: [ "authentication", "id", "login" ],
        additionalProperties: false,
        properties:
        {
            "authentication": schema_templates.authentication,
            "id": schema_templates.uinteger,
            "login": { type: "string", minLength: 1, maxLength: 100 },
            "password": { type: "string" },
            "permissions": { type: "array", maxItems: 5, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 1, enum: [ "R", "I", "U", "D", "A" ] } },
        }
    }
};
export default [
    { method: "GET",  path: "/admin/accounts", access: "authorization", schema: EMPTY_GET_SCHEMA, handler: get_admin_accounts },
    { method: "GET",  path: "/admin/logs", access: "authorization", schema: EMPTY_GET_SCHEMA, handler: get_admin_logs },

    { method: "POST",  path: "/admin/accounts/delete", access: "authorization", schema: ACCOUNTS_DELETE_SCHEMA, handler: delete_admin_accounts },
    { method: "POST",  path: "/admin/accounts/create", access: "authorization", schema: ACCOUNTS_CREATE_SCHEMA, handler: create_admin_accounts },
    { method: "POST",  path: "/admin/accounts/edit", access: "authorization", schema: ACCOUNTS_EDIT_SCHEMA, handler: edit_admin_accounts }
];