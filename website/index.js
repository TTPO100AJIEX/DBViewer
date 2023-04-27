import config from 'common/configs/config.js';
import fs from 'fs';
import fastify from 'fastify';
import ajv_formats from 'ajv-formats';

const app = fastify({
    http2: true,
    https: 
    {
        allowHTTP1: true,
        key: fs.readFileSync(config.website.ssl_key, 'utf8'),
        cert: fs.readFileSync(config.website.ssl_cert, 'utf8')
    },
    forceCloseConnections: true,
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    maxParamLength: 32,
    bodyLimit: 1048576,
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
    logger: config.stage == "testing",
    disableRequestLogging: true,
    caseSensitive: true,
    trustProxy: false,
    exposeHeadRoutes: true,
    return503OnClosing: true,
    ajv:
    {
        plugins: [ [ ajv_formats, { mode: 'full', keywords: true } ] ],
        customOptions:
        {
            // strict mode options
            strict: true, strictSchema: true, strictNumbers: true, strictTypes: true, strictTuples: true, strictRequired: true,
            allowUnionTypes: false, allowMatchingProperties: false, validateFormats: true,
            // error reporting
            allErrors: false, verbose: false, messages: true,
            // validation and reporting options:
            $data: false, discriminator: false, unicodeRegExp: true, $comment: false,
            // options to modify validated data:
            removeAdditional: true, useDefaults: true, coerceTypes: "array",
            // advanced options:
            inlineRefs: true
        }
    }
});

import security from "./plugins/security.js"; app.register(security);
import other from "./plugins/other.js"; app.register(other);
import request from "./plugins/request.js"; app.register(request);
import response from "./plugins/response.js"; app.register(response);
import utility from "./plugins/utility.js"; app.register(utility);
import oauth from "./plugins/oauth.js"; app.register(oauth);
import routes from "./plugins/routes.js"; app.register(routes);

app.listen({ "port": config.website.https_port, "host": "0.0.0.0"}, (err, address) => 
{
    if (err) throw err;
    console.info(`Server is now listening on ${address}`);
});