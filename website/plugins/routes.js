import fastify_plugin from 'fastify-plugin';

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
async function register_routes(app, options)
{
    const EMPTY_GET_SCHEMA = { querystring: { type: "object", additionalProperties: false, properties: { } } };
    app.get('/favicon.ico', { schema: EMPTY_GET_SCHEMA }, (req, res) => res.sendFile("favicon.ico", dirname(dirname(fileURLToPath(import.meta.url))) + '/static/images/favicon'));
    app.get('/apple-touch-icon.png', { schema: EMPTY_GET_SCHEMA }, (req, res) => res.sendFile("apple-touch-icon.png", dirname(dirname(fileURLToPath(import.meta.url))) + '/static/images/favicon'));
    app.get('/robots.txt', { schema: EMPTY_GET_SCHEMA }, (req, res) => res.sendFile("robots.txt", dirname(dirname(fileURLToPath(import.meta.url)))));
    app.get('/sitemap.xml', { schema: EMPTY_GET_SCHEMA }, (req, res) => res.sendFile("sitemap.xml", dirname(dirname(fileURLToPath(import.meta.url)))));

    for (const filename of fs.readdirSync("website/routes"))
    {
        if (fs.lstatSync(path.join("website/routes", filename)).isDirectory()) continue;
        const { default: routes } = await import(path.join("../routes", filename));
        for (const route of routes)
        {
            route.config ??= { };
            route.config.access ??= route.access;
            delete route.access;

            if ("paths" in route)
            {
                for (const path of route.paths)
                {
                    const { paths: _, ...routeCopy } = route;
                    routeCopy.path = path;
                    app.route(routeCopy);
                }
            }
            else
            {
                app.route(route);
            }
        }
    }
}

export default fastify_plugin(register_routes, {
    name: 'routes', encapsulate: false,
    decorators: { reply: [ "sendFile", "render", "error", "login", "logout" ] },
    dependencies: [ 'security', 'utility', 'other', 'request', 'response', 'oauth' ]
});