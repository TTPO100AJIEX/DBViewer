import fastify_plugin from 'fastify-plugin';

import config from 'common/configs/config.js';
import { InternalDatabase } from 'common/postgreSQL/postgreSQL.js';
import { Cache } from "common/redis/redis.js";

import bcrypt from 'bcrypt';
import crypto from 'crypto';

function register_oauth(app, options, done)
{
    app.decorateRequest("session_id", null);
    app.decorateRequest("get_sessionid", function()
    {
        if (this.session_id) return this.session_id;
        if ("__Secure-authorization" in this.cookies)
        {
            let session_id = { valid: false };
            try { session_id = this.unsignCookie(this.cookies["__Secure-authorization"]); } catch(err) { }
            if (session_id.valid && session_id.value.length == 44) this.session_id = session_id.value;
        }
        return this.session_id;
    });

    app.decorateRequest("authentication", null);
    app.decorateRequest("authentication_data", null);
    app.decorateRequest("authenticate", async function()
    {
        if (this.authentication) return this.authentication;
        this.authentication = crypto.randomBytes(16).toString('hex');
        await Cache.set_expire(`authentication-${this.authentication}`, JSON.stringify({ "ip": this.ip, "page": this.url }), config.website.authentication_expiration);
        return this.authentication;
    });
    app.decorateRequest("check_authentication", async function(code)
    {
        if (this.authentication_data) return this.authentication_data;
        let authentication = await Cache.get_delete(`authentication-${code}`);
        if (!authentication) return this.authentication_data = null;
        authentication = JSON.parse(authentication);
        if (this.ip != authentication.ip) return this.authentication_data = null;
        return this.authentication_data = authentication;
    });

    app.decorateRequest("authorization", null);
    app.decorateRequest("authorize", async function()
    {
        if (this.authorization) return this.authorization;
        if (!this.get_sessionid()) return this.authorization = null;
        let authorization = await Cache.get_expire(`session_id-${this.session_id}`, config.website.authorization_expiration); // { "user_id": 1 }
        if (!authorization) return this.authorization = null;
        authorization = JSON.parse(authorization);

        if (!authorization.expiration || new Date(authorization.expiration) <= new Date())
        {
            authorization = await InternalDatabase.query(`SELECT id AS user_id, login, permissions FROM users WHERE id = $1`, [ authorization.user_id ], { one_response: true });
            if (!authorization) { await Cache.delete(`session_id-${this.session_id}`); return this.authorization = null; }
            authorization = { ...authorization, expiration: Date.now() + config.website.user_data_expiration };
            await Cache.set_keepttl(`session_id-${this.session_id}`, JSON.stringify(authorization));
        }
        
        return this.authorization = authorization;
    });



    app.addHook('preValidation', async (req, res) =>
    {
        if (!req.routerPath || !req.routeConfig?.access || req.routeConfig.access === "only_public") return;
        await req.authenticate();
    });
    app.addHook('preHandler', async (req, res) => 
    {
        if (!req.routeConfig?.access || req.routeConfig.access === "only_public") return;
        if (req.method != "GET" && !(await req.check_authentication(req.body.authentication))) return res.error(400);
        await req.authorize();
        if (!req.authorization && req.routeConfig.access == "authorization") return res.error(401);
    });



    app.decorateReply("login", async function(login, password)
    {
        const req = this.request, res = this;
        if (!(await req.check_authentication(req.body.authentication))) return res.error(400);
        
        const users = await InternalDatabase.query(`SELECT id, login, password, permissions FROM users WHERE login = $1`, [ login ]);
        if (users.length == 0) return res.error(401, [ "Ошибка авторизации!", "Такого пользователя нет!" ]);
        for (const user of users)
        {
            if (!(await bcrypt.compare(password, user.password))) continue;
            req.session_id = crypto.randomBytes(32).toString('base64');
            const user_data = { user_id: user.id, login: user.login, permissions: user.permissions, expiration: Date.now() + config.website.user_data_expiration };
            await Cache.set_expire(`session_id-${req.session_id}`, JSON.stringify(user_data), config.website.authorization_expiration);
            res.setCookie('__Secure-authorization', req.session_id, { domain: config.website.host, path: '/', secure: true, httpOnly: true, sameSite: 'Lax', signed: true });
            return res.redirect("/database");
        }
        return res.error(401, [ "Ошибка авторизации!", "Пароль неверный!" ]);
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