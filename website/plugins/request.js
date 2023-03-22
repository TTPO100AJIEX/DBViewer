import fastify_plugin from 'fastify-plugin';

import fastify_formbody from "@fastify/formbody";
import fastify_websocket from "@fastify/websocket";

function register_request_plugins(app, options, done)
{
    /*----------------------------------FORMBODY----------------------------------*/
    app.register(fastify_formbody, { bodyLimit: 1048576 });
    
    /*----------------------------------WEBSOCKET----------------------------------*/
    app.register(fastify_websocket);

    done();
}

export default fastify_plugin(register_request_plugins, { name: 'request', encapsulate: false });