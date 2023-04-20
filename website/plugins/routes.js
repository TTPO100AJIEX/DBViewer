import fastify_plugin from 'fastify-plugin';

import SCHEMAS from "./schemas/schemas.js";

import { get_main, post_oauth, get_logout } from '../routes/main.js';
import { get_database, get_table, post_data, websocket_data } from '../routes/database.js';
import { create_admin_accounts, delete_admin_accounts, edit_admin_accounts, get_admin_accounts, get_admin_logs } from '../routes/admin.js';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
function register_routes(app, options, done)
{
    app.get('/favicon.ico', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("favicon.ico", dirname(dirname(fileURLToPath(import.meta.url))) + '/static/images/favicon'));
    app.get('/apple-touch-icon.png', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("apple-touch-icon.png", dirname(dirname(fileURLToPath(import.meta.url))) + '/static/images/favicon'));
    app.get('/robots.txt', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("robots.txt", dirname(dirname(fileURLToPath(import.meta.url)))));
    app.get('/sitemap.xml', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("sitemap.xml", dirname(dirname(fileURLToPath(import.meta.url)))));

    app.post("/oauth", { schema: SCHEMAS.EMPTY_GET, config: { access: "public" } }, post_oauth);
    app.get("/logout", { schema: SCHEMAS.EMPTY_GET, config: { access: "public" } }, get_logout);
    app.get("/", { schema: SCHEMAS.EMPTY_GET, config: { access: "public" } }, get_main);
    
    app.get("/database", { schema: SCHEMAS.EMPTY_GET, config: { access: "authorization" } }, get_database);
    app.get("/table", { schema: SCHEMAS.TABLE_GET, config: { access: "authorization" } }, get_table);
    app.get("/data", { websocket: true, config: { access: "authorization" } }, websocket_data);
    app.post("/data", { schema: SCHEMAS.DATA_POST, config: { access: "authorization" } }, post_data);
    
    app.get("/admin/accounts", { schema: SCHEMAS.EMPTY_GET, config: { access: "authorization" } }, get_admin_accounts);
    app.get("/admin/logs", { schema: SCHEMAS.EMPTY_GET, config: { access: "authorization" } }, get_admin_logs);
    app.post("/admin/accounts/delete", { schema: SCHEMAS.ACCOUNTS_DELETE, config: { access: "authorization" } }, delete_admin_accounts);
    app.post("/admin/accounts/create", { schema: SCHEMAS.ACCOUNTS_CREATE, config: { access: "authorization" } }, create_admin_accounts);
    app.post("/admin/accounts/edit", { schema: SCHEMAS.ACCOUNTS_EDIT, config: { access: "authorization" } }, edit_admin_accounts);
    
    done();
}

export default fastify_plugin(register_routes, {
    name: 'routes', encapsulate: false,
    decorators:
    {
        request: [ "status" ],
        reply: [ "sendFile", "render", "error", "login", "logout" ]
    },
    dependencies: [ 'security', 'utility', 'other', 'request', 'response', 'oauth' ]
});