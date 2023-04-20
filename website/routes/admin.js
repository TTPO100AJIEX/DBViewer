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
}

export { get_admin_accounts, delete_admin_accounts, create_admin_accounts, edit_admin_accounts, get_admin_logs };