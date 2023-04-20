import bcrypt from 'bcrypt';
import { InternalDatabase, TargetDatabase, config } from "common/index.js";

async function get_admin_accounts(req, res)
{
    if (!req.authorization.permissions.includes("A")) return res.error(403);

    const [ { current_database: databaseName }, tables ] = await TargetDatabase.query_multiple([
        { query: `SELECT current_database()`, one_response: true },
        
        `SELECT pg_class.oid AS id, (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS name
        FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE (pg_class.relkind = 'r' OR pg_class.relkind = 'v' OR pg_class.relkind = 'm') AND pg_namespace.nspname != 'information_schema' AND NOT starts_with(pg_namespace.nspname, 'pg_')`,
    ]);

    const accounts = await InternalDatabase.query(`SELECT id, login, permissions FROM users ORDER BY id ASC`);

    return res.render("admin/accounts.ejs", { databaseName, tables, accounts });
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

    const [ { current_database: databaseName }, tables ] = await TargetDatabase.query_multiple([
        { query: `SELECT current_database()`, one_response: true },
        
        `SELECT pg_class.oid AS id, (CASE WHEN pg_namespace.nspname = 'public' THEN '' ELSE pg_namespace.nspname || '.' END) || pg_class.relname AS name
        FROM pg_class INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE (pg_class.relkind = 'r' OR pg_class.relkind = 'v' OR pg_class.relkind = 'm') AND pg_namespace.nspname != 'information_schema' AND NOT starts_with(pg_namespace.nspname, 'pg_')`,
    ]);

    const logsColumns = await InternalDatabase.query(`WITH enums (enumtypid, enumlabels) AS ( SELECT enumtypid, array_agg(enumlabel::text) AS enumlabels FROM pg_enum GROUP BY enumtypid ) SELECT
            pg_attribute.attname AS name, pg_attribute.atttypid AS type_id, pg_attribute.atttypmod AS type_mod, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) AS type_name,
            pg_attribute.attidentity = 'a' AS flags_IA, pg_attribute.attidentity = 'd' AS flags_ID,
            pg_attribute.attnotnull AS flags_NN, pg_attribute.atthasdef AS flags_D, (pg_attribute.attgenerated = 's') AS flags_G,
            EXISTS( SELECT * FROM pg_constraint WHERE pg_constraint.conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'u' ) AS flags_U,
            EXISTS( SELECT * FROM pg_constraint WHERE pg_constraint.conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'p' ) AS flags_PK,
            enums.enumlabels AS enumlabels
        FROM pg_attribute INNER JOIN pg_class ON pg_class.oid = pg_attribute.attrelid LEFT JOIN enums ON enums.enumtypid = pg_attribute.atttypid
        WHERE pg_class.relname = 'logs' AND pg_attribute.attnum > 0 AND NOT pg_attribute.attisdropped
        ORDER BY attnum ASC`, [ ], true);
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

    return res.render("admin/logs.ejs", { databaseName, tables, columns });
}

export { get_admin_accounts, delete_admin_accounts, create_admin_accounts, edit_admin_accounts, get_admin_logs };