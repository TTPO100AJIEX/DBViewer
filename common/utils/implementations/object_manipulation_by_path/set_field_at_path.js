export default function set_field_at_path(obj, path, value)
{
    for (let i = 0; i < path.length - 1; i++) obj = (obj[path[i]] ??= { });
    obj[path.at(-1)] = value;
    return obj;
}