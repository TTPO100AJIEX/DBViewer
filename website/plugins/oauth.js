import { config, InternalDatabase, Redis } from "common/index.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fastify_plugin from 'fastify-plugin';

function register_oauth(app, options, done)
{
    app.decorateRequest("session_id", null);
    app.decorateRequest("get_sessionid", function()
    {
        if (this.session_id) return this.session_id;
        if ("__Secure-authorization" in this.cookies)
        {
            let session_id = { valid: false };
            try { session_id = this.unsignCookie(this.cookies["__Secure-authorization"]); } catch(err) { session_id = { valid: false } }
            if (session_id.valid && session_id.value.length == 44) this.session_id = session_id.value;
            else res.logout();
        }
        return this.session_id;
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
        this.set_status("authenticated");
        this.authentication = crypto.randomBytes(16).toString('hex');
        await Redis.set_expire(`authentication-${this.authentication}`, JSON.stringify({ "ip": this.ip, "page": this.url }), config.website.authentication_expiration);
        return this.authentication;
    });
    app.decorateRequest("check_authentication", async function(code)
    {
        if (this.authentication_data) return this.authentication_data;
        let authentication = await Redis.get_delete(`authentication-${code}`);
        if (!authentication) return this.response.error(400);
        authentication = JSON.parse(authentication);
        if (this.ip != authentication.ip) return this.response.error(400);
        return this.authentication_data = authentication;
    });

    app.decorateRequest("authorization", null);
    app.decorateRequest("authorize", async function()
    {
        if (this.authorization) return this.authorization;
        this.session_id = this.get_sessionid();
        if (this.response.sent || !this.session_id) return;
        let authorization = await Redis.get_expire(`session_id-${this.session_id}`, config.website.authorization_expiration); // { "user_id": 1 }
        if (!authorization) return this.response.logout();
        authorization = JSON.parse(authorization);

        if (!authorization.expiration || new Date(authorization.expiration) <= new Date())
        {
            authorization = await InternalDatabase.query(`SELECT id AS user_id, login, permissions FROM users WHERE id = $1`, [ authorization.user_id ], false, true);
            if (!authorization) { await Redis.delete(`session_id-${this.session_id}`); return this.response.logout(); }
            authorization = { ...authorization, expiration: Date.now() + config.website.user_data_expiration };
            await Redis.set_keepttl(`session_id-${this.session_id}`, JSON.stringify(authorization));
        }

        this.set_status("authorized");
        return this.authorization = authorization;
    });

    app.addHook('preValidation', async (req, res) =>
    {
        if (!req.routerPath) return res.error(404);
        if (!req.routeConfig?.access || req.routeConfig.access === "only_public") return;
        req.authentication = await req.authenticate();
    });
    app.addHook('preHandler', async (req, res) => 
    {
        if (req.method != "GET")
        {
            req.authentication_data = await req.check_authentication(req.body.authentication);
            if (res.sent) return;
        }
        if (!req.routeConfig?.access || req.routeConfig.access === "only_public") return;
        req.authorization = await req.authorize();
        if (res.sent) return;
        if (!req.authorization && req.routeConfig.access == "authorization") return res.error(401);
    });


    app.decorateReply("login", async function(login, password)
    {
        const req = this.request, res = this;
        if (!login || !password) return res.error(400);
        req.authentication_data = await req.check_authentication(req.body.authentication);
        
        const users = await InternalDatabase.query(`SELECT id, login, password, permissions FROM users WHERE login = $1`, [ login ], true);
        if (users.length == 0) return res.error(401, [ "Ошибка авторизации!", "Такого пользователя нет!" ]);
        for (const user of users)
        {
            if (!(await bcrypt.compare(password, user.password))) continue;
            req.session_id = crypto.randomBytes(32).toString('base64');
            await Redis.set_expire(`session_id-${req.session_id}`, JSON.stringify({ user_id: user.id, login: user.login, permissions: user.permissions, expiration: Date.now() + config.website.user_data_expiration }), config.website.authorization_expiration);
            res.setCookie('__Secure-authorization', req.session_id, { domain: config.website.host, path: '/', secure: true, httpOnly: true, sameSite: 'Lax', signed: true });
            return res.redirect("/database");
        }
        return res.error(401, [ "Ошибка авторизации!", "Пароль не верный!" ]);
    });



    app.decorateReply("logout", async function()
    {
        this.clearCookie('__Secure-authorization', { domain: config.website.host, path: '/', secure: true, httpOnly: true, sameSite: 'Lax', signed: true });
        return this.status(301).redirect("/");
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