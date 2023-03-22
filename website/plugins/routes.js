import fastify_plugin from 'fastify-plugin';

import SCHEMAS from "./schemas/schemas.js";

import { dirname } from 'path';
import { fileURLToPath } from 'url';
function register_routes(app, options, done)
{
    app.get('/favicon.ico', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("favicon.ico", dirname(dirname(fileURLToPath(import.meta.url))) + '/static/images/favicon'));
    app.get('/apple-touch-icon.png', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("apple-touch-icon.png", dirname(dirname(fileURLToPath(import.meta.url))) + '/static/images/favicon'));
    app.get('/robots.txt', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("robots.txt", dirname(dirname(fileURLToPath(import.meta.url)))));
    app.get('/sitemap.xml', { schema: SCHEMAS.EMPTY_GET }, (req, res) => res.sendFile("sitemap.xml", dirname(dirname(fileURLToPath(import.meta.url)))));
    
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