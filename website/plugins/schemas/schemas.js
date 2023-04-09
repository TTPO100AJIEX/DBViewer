import templates from "./templates.json" assert { type: "json" };

export default {
    EMPTY_GET:
    {
        querystring: { type: "object", additionalProperties: false, properties: { } }
    },
    TABLE_GET:
    {
        params:
        {
            type: "object",
            required: [ "schemaname", "tablename" ],
            additionalProperties: false,
            properties:
            {
                "schemaname": { type: "string" },
                "tablename": { type: "string" }
            }
        }
    }
};