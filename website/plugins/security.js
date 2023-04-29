import fastify_plugin from 'fastify-plugin';

import config from 'common/configs/config.js';
import { Cache } from "common/redis/redis.js";

import fastify_helmet from "@fastify/helmet";
import fastify_cors from "@fastify/cors";
import fastify_rate_limit from "@fastify/rate-limit";

function register_security_plugins(app, options, done)
{
    /*----------------------------------HELMET----------------------------------*/
    app.register(fastify_helmet,
    {
        global: true,
        enableCSPNonces: true,
        contentSecurityPolicy: 
        {
            useDefaults: false,
            directives: 
            {
                "default-src": [ "'none'" ],
    
                //"child-src": [ "'self'" ],
                "connect-src": [ "'self'", "'report-sample'" ],
                "font-src": [ "'self'", "https://fonts.gstatic.com", "'report-sample'" ],
                //"frame-src": [ "'self'" ],
                "img-src": [ "'self'", "'report-sample'" ],
                //"media-src": [ "'self'" ],
                //"object-src": [ "'self'" ],
                //"prefetch-src": [ "'self'" ],
                "script-src": [ "'strict-dynamic'", "https://www.gstatic.com", "'self'", "'report-sample'" ],
                "style-src": [ "'self'", "https://fonts.googleapis.com", "https://www.gstatic.com", "'report-sample'" ],
                //"worker-src": [ "'self'" ],
    
                "base-uri": [ "'none'" ],
    
                "form-action": [ "'self'", "'report-sample'" ],
                //"frame-ancestors": [ "'self'" ],
    
                "report-uri": [ "/csp-violation-report" ],
                "report-to": [ "dbviewer" ],
                "require-trusted-types-for": [ "'script'" ],
                "upgrade-insecure-requests": [ ]
            }
        },
        crossOriginEmbedderPolicy: true, //require-corp
        crossOriginOpenerPolicy: { policy: "same-origin" },
        crossOriginResourcePolicy: { policy: "same-origin" },
        expectCt: { maxAge: 24 * 60 * 60, enforce: true, reportUri: "/ct-violation-report" },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        hsts: { maxAge: 7 * 24 * 60 * 60, includeSubDomains: false, preload: true },
        noSniff: true,
        originAgentCluster: true,
        dnsPrefetchControl: { allow: true },
        frameguard: { action: "SAMEORIGIN" },
        hidePoweredBy: true,
        xssFilter: true
    });
    app.addContentTypeParser('application/csp-report', { parseAs: 'string' }, function (request, payload, done)
    {
        try { done(null, JSON.parse(payload)) } catch(err) { err.statusCode = 400; done(err, undefined) }
    });
    app.addContentTypeParser('application/reports+json', {parseAs: 'string'}, function (request, payload, done)
    {
        try { done(null, JSON.parse(payload)) } catch(err) { err.statusCode = 400; done(err, undefined) }
    });
    app.addHook("onRequest", (req, res, next) =>
    {
        res.header('Report-To', `{"group":"dbviewer","max_age":10886400,"endpoints":[{"url": "https://${config.website.host}/csp-violation-report"}]}`);
        res.header('Reporting-Endpoints', `dbviewer="/csp-violation-report"`);
        next();
    });
    app.post('/csp-violation-report', (req, res) => 
    {
        console.warn(req.body);
        return res.send("Acknowledged");
    });
    app.post('/ct-violation-report', (req, res) => 
    {
        console.warn(req.body);
        return res.send("Acknowledged");
    });
    



    /*----------------------------------CORS----------------------------------*/
    app.register(fastify_cors,
    {
        origin: [ `https://${config.website.host}` ],
        methods: 'GET,POST',
        maxAge: 300
    });
    


    
    /*----------------------------------RATE LIMIT----------------------------------*/
    app.register(fastify_rate_limit, {
        global: true,
        max: config.stage == "testing" ? 1000000 : 100,
        timeWindow: 60000,
        ban: config.stage == "testing" ? 1500000 : 150,
        continueExceeding: true,
        addHeadersOnExceeding: { 'x-ratelimit-limit': false, 'x-ratelimit-remaining': false, 'x-ratelimit-reset': false, 'retry-after': false },
        addHeaders: { 'x-ratelimit-limit': false, 'x-ratelimit-remaining': true, 'x-ratelimit-reset': false, 'retry-after': true },
        cache: 10000,
        redis: Cache.get_raw(),
        nameSpace: 'website-rate-limit-',
        skipOnError: true,
        onExceeded: (req) => console.info(`Rate Limit exceeded by ${req.ip}`)
    });

    done();
}

export default fastify_plugin(register_security_plugins, { name: 'security', encapsulate: false });