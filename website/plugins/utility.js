import fastify_plugin from 'fastify-plugin';

import fastify_circuit_breaker from "@fastify/circuit-breaker";
import under_pressure from '@fastify/under-pressure';

function register_utility_plugins(app, options, done)
{
    /*----------------------------------CIRCUIT BREAKER----------------------------------*/
    app.register(fastify_circuit_breaker, {
        threshold: 5, timeout: 10000,
        onCircuitOpen: async (req, res) =>
        {
            console.warn(`@fastify/circuit-breaker: onCircuitOpen triggered for ${req.routerPath}${req.query}${JSON.stringify(req.body)}`);
            return res.error(508);
        },
        onTimeout: async (req, res) =>
        {
            console.warn(`@fastify/circuit-breaker: onTimeout triggered for ${req.routerPath}${req.query}${JSON.stringify(req.body)}`);
            return res.error(504);
        }
    });
    



    /*----------------------------------UNDER PRESSURE----------------------------------*/
    app.register(under_pressure, { 
        maxEventLoopDelay: 250,
        maxHeapUsedBytes: 1048576000,
        maxRssBytes: 1048576000,
        maxEventLoopUtilization: 0.8,
        message: 'The server is exhausted! Try again later!',
        retryAfter: 60,
        pressureHandler: (req, res, type, value) =>
        {
            if (type === under_pressure.TYPE_HEAP_USED_BYTES) { console.warn(`Heap has been exhausted: ${value}`); return; }
            if (type === under_pressure.TYPE_RSS_BYTES) { console.warn(`RSS has been exhausted: ${value}`); return; }
            return res.error(503);
        },
        exposeStatusRoute:
        {
            routeResponseSchemaOpts:
            {
                metrics:
                {
                    type: 'object',
                    properties: { eventLoopDelay: { type: 'number' }, rssBytes: { type: 'number' }, heapUsed: { type: 'number' }, eventLoopUtilized: { type: 'number' } }
                },
                uptime: { type: 'number' }
            },
            url: "/serverstatus"
        },
        healthCheck: async (fastifyInstance) => ({ metrics: fastifyInstance.memoryUsage(), uptime: process.uptime() }),
    });

    done();
}

export default fastify_plugin(register_utility_plugins, { name: 'utility', encapsulate: false });