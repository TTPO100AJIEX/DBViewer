import { config, Utils, TargetDatabase, InternalDatabase, Redis } from "common/index.js";
import crypto from 'crypto';
import fastify_plugin from 'fastify-plugin';

function register_oauth(app, options, done)
{
    app.decorateRequest("session_id", null);
    app.decorateRequest("get_sessionid", function()
    {
    });

    app.decorateRequest("status", "unauthenticated");
    app.decorateRequest("set_status", function (status)
    {
        function get_status_level(status)
        {
            switch (status)
            {
                case "authenticated": return 1;
                case "authorized": return 2;
                default: return 0;
            }
        }
        const curlevel = get_status_level(this.status), newlevel = get_status_level(status);
        if (newlevel > curlevel) this.status = status;
    });

    app.decorateRequest("authentication", null);
    app.decorateRequest("authentication_data", null);
    app.decorateRequest("authenticate", async function()
    {
    });
    app.decorateRequest("check_authentication", async function(code)
    {
    });

    app.decorateRequest("authorization", null);
    app.decorateRequest("authorize", async function()
    {
    });

    app.addHook('preValidation', async (req, res) =>
    {
    });
    app.addHook('preHandler', async (req, res) => 
    {
    });




    app.decorateReply("login", async function()
    {
    });



    app.decorateReply("logout", async function()
    {
    });




    done();
}

export default fastify_plugin(register_oauth, {
    name: 'oauth', encapsulate: false,
    decorators:
    {
        reply: [ "error" ]
    },
    dependencies: [ 'security', 'utility', 'other', 'request', 'response' ]
});