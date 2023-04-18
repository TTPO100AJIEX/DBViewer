import templates from "./templates.json" assert { type: "json" };

export default {
    EMPTY_GET:
    {
        querystring: { type: "object", additionalProperties: false, properties: { } }
    },
    TABLE_GET:
    {
        query:
        {
            type: "object",
            required: [ "id" ],
            additionalProperties: false,
            properties:
            {
                "id": { type: "integer" }
            }
        }
    },
    DATA_POST:
    {
        body:
        {
            type: "object",
            required: [ "authentication", "table", "actions" ],
            additionalProperties: false,
            properties:
            {
                "authentication": templates.authentication,
                "table": { type: "integer" },
                "actions": { type: "string" }
            }
        }
    }
};