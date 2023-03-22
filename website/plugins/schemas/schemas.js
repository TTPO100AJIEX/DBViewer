import templates from "./templates.json" assert { type: "json" };

export default {
    EMPTY_GET:
    {
        querystring: { type: "object", additionalProperties: false, properties: { } }
    }
};