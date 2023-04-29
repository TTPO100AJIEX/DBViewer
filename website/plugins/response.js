import fastify_plugin from 'fastify-plugin';

import config from 'common/configs/config.js';

import fastify_compress from "@fastify/compress";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fastify_static from "@fastify/static";
import view from "@fastify/view";
import ejs from 'ejs';
import html_minifier from "html-minifier";

function register_response_plugins(app, options, done)
{
    /*----------------------------------COMPRESS----------------------------------*/
    app.register(fastify_compress);
    



    /*----------------------------------STATIC----------------------------------*/
    app.register(fastify_static, {
        root: dirname(dirname(fileURLToPath(import.meta.url))) + "/static",
        prefix: "/static",

        acceptRanges: true,
        cacheControl: true,
        dotfiles: 'ignore',
        etag: true,
        extensions: false,
        immutable: false,
        lastModified: true,
        maxAge: config.stage == "testing" ? 0 : 604800000,

        preCompressed: true,
        wildcard: false,
        index: false,
        allowedPath: (pathname, root) =>
        {
            return(pathname.startsWith("/css") || pathname.startsWith("/js") || pathname.startsWith("/images")
                    || pathname == "robots.txt" || pathname == "sitemap.xml" || pathname == "favicon.ico" || pathname == "apple-touch-icon.png")
        }
    });
    


    
    /*----------------------------------EJS----------------------------------*/
    app.register(view, {
        "engine": { "ejs": ejs },
        "production": config.stage != "testing",
        "options":
        {
            "useHtmlMinifier": config.stage != "testing" ? html_minifier : false,
            "htmlMinifierOptions":
            {
                "caseSensitive": true,
                "collapseBooleanAttributes": true,
                "collapseInlineTagWhitespace": true,
                "collapseWhitespace": true,
                "conservativeCollapse": false,
                "continueOnParseError": false,
                "decodeEntities": true,
                "html5": true,
                "includeAutoGeneratedTags": true,
                "keepClosingSlash": false,
                "minifyCSS": true,
                "minifyJS": true,
                "minifyURLs": false,
                "preserveLineBreaks": false,
                "preventAttributesEscaping": false,
                "processConditionalComments": false,
                "processScripts": [],
                "quoteCharacter": "\"",
                "removeAttributeQuotes": false,
                "removeComments": true,
                "removeEmptyAttributes": true,
                "removeEmptyElements": false,
                "removeOptionalTags": false,
                "removeRedundantAttributes": false,
                "removeScriptTypeAttributes": true,
                "removeStyleLinkTypeAttributes": true,
                "removeTagWhitespace": false,
                "sortAttributes": true,
                "sortClassName": true,
                "trimCustomFragments": false,
                "useShortDoctype": true
            }
        },
        "propertyName": "render",
        "root": "./website/views/",
        "defaultContext": { config }
    });
    app.addHook("onRequest", async (req, res) =>
    {
        req.response = res;
        res.locals = { "req": req, "res": res };
    });
    


    /*----------------------------------ERROR----------------------------------*/
    app.decorateReply("error", function(code, description, opts)
    {
        if (!description)
        {
            switch(code)
            {
                case 200: { description = [ "Действие было выполнено успешно!", "Вы будете перенаправлены обратно в ближайшее время!" ]; break; }

                case 400: { description = [ "Запрос неверен!", "Повторите попытку!" ]; break; }
                case 401: { description = [ "Ошибка авторизации!", "Авторизуйтесь и повторите попытку!" ]; break; }
                case 402: { description = [ "Запрошенный ресурс доступен только после оплаты!", "Оплатите доступ к ресурсу и попробуйте снова!" ]; break; }
                case 403: { description = [ "У вас нет доступа к запрошенному ресурсу!", "Повторите попытку позже или обратитесь в поддержку!" ]; break; }
                case 404: { description = [ "Запрошенный ресурс не найден!", "Убедитесь, что указан верный адрес!" ]; break; }
                case 429: { description = [ "Вы отправляете слишком много запросов!", "Попробуйте позже!" ]; break; }

                case 500: { description = [ "Ошибка сервера!", "Повторите попытку позже или обратитесь в поддержку!" ]; break; }
                case 502: { description = [ "Ошибка взаимодействия!", "Повторите попытку позже или обратитесь в поддержку!" ]; break; }
                case 503: { description = [ "Сервер перегружен!", "Повторите попытку позже или обратитесь в поддержку!" ]; break; }
                case 504: { description = [ "Ошибка взаимодействия!", "Повторите попытку позже или обратитесь в поддержку!" ]; break; }
                case 508: { description = [ "Ошибка обработки запроса!", "Повторите попытку позже или обратитесь в поддержку!" ]; break; }

                default: { description = [ "Произошла неизвестная ошибка!", "Повторите попытку позже или обратитесь в поддержку!" ]; }
            }
        }
        return this.status(isNaN(code) ? 500 : code).render("error.ejs", { "error": code, "title": "", "description": description, ...opts });
    });
    app.setNotFoundHandler({ preHandler: app.rateLimit({ max: 25, timeWindow: 60000, ban: 40 }) }, (req, res) => res.error(404));
    app.setErrorHandler((error, req, res) =>
    {
        if (config.stage == "testing") console.error(error);
        res.error(error.statusCode ?? 500, [ "Ошибка сервера!", error.message ?? error ]);
    });



    done();
}

export default fastify_plugin(register_response_plugins, { name: 'response', encapsulate: false });