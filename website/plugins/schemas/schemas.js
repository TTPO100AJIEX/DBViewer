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
    },

    ACCOUNTS_DELETE:
    {
        body:
        {
            type: "object",
            required: [ "authentication", "id" ],
            additionalProperties: false,
            properties:
            {
                "authentication": templates.authentication,
                "id": templates.uinteger
            }
        }
    },
    ACCOUNTS_CREATE:
    {
        body:
        {
            type: "object",
            required: [ "authentication", "login", "password" ],
            additionalProperties: false,
            properties:
            {
                "authentication": templates.authentication,
                "login": { type: "string", minLength: 1, maxLength: 100 },
                "password": { type: "string", minLength: 1 },
                "permissions": { type: "array", maxItems: 5, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 1, enum: [ "R", "I", "U", "D", "A" ] } },
            }
        }
    },
    ACCOUNTS_EDIT:
    {
        body:
        {
            type: "object",
            required: [ "authentication", "id", "login" ],
            additionalProperties: false,
            properties:
            {
                "authentication": templates.authentication,
                "id": templates.uinteger,
                "login": { type: "string", minLength: 1, maxLength: 100 },
                "password": { type: "string" },
                "permissions": { type: "array", maxItems: 5, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 1, enum: [ "R", "I", "U", "D", "A" ] } },
            }
        }
    }
};