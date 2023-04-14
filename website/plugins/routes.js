import fastify_plugin from 'fastify-plugin';

import SCHEMAS from "./schemas/schemas.js";

import { get_main, post_oauth, get_logout } from '../routes/main.js';
import { get_database, get_table, websocket_data } from '../routes/database.js';

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