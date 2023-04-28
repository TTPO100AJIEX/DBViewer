import fs from 'fs';
import path from 'path';

import Ajv from "ajv/dist/jtd.js";
const ajv = new Ajv();

export default async function compile_websocket_handler(folder)
{
    let handlers = { }, schemas = { };
    for (const filename of fs.readdirSync(path.join("website/routes", folder)))
    {
        if (!fs.lstatSync(path.join("website/routes", folder, filename)).isFile()) continue;
        const { default: routes } = await import(path.join("../", folder, filename));
        for (const route of routes)
        {
            if (!("handler" in route)) throw `load_websocket_routes: ${filename} does not export handler`;
            if (!("requestNames" in route) && !("requestName" in route)) throw `load_websocket_routes: ${filename} does not export both requestName and requestNames`;

            if ("requestNames" in route)
            {
                for (const requestName of route.requestNames)
                {
                    if (requestName in handlers) throw `load_websocket_routes: route ${requestName} already registered`;
                    handlers[requestName] = route.handler;
                    if (route.schema) schemas[requestName] = { properties: { data: route.schema } };
                    else schemas[requestName] = { optionalProperties: { data: { } } };
                }
            }
            else
            {
                if (route.requestName in handlers) throw `load_websocket_routes: route ${requestName} already registered`;
                handlers[route.requestName] = route.handler;
                if (route.schema) schemas[route.requestName] = { properties: { data: route.schema } };
                else schemas[route.requestName] = { optionalProperties: { data: { } } };
            }
        }
    }

    const parseRequest = ajv.compileParser({ discriminator: "requestName", mapping: schemas });
    return async function handleRequest(connection, request, message)
    {
        message = parseRequest(message);
        if (message === undefined) throw 'Invalid object received: ' + parseRequest.message;
        await handlers[message.requestName](message.data, connection.socket, request);
    };
}