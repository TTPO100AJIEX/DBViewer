import { Utils } from "common/index.js";

export default function parse_response(rows)
{
    for (const key in rows[0])
    {
        const path = key.split('_');
        if (path.length == 1) continue;
        for (let obj of rows)
        {
            const save = obj[key]; delete obj[key];
            Utils.set_field_at_path(obj, path, save);
        }
    }
    return(rows);
}