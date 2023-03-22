export default function isArray(obj)
{
    return (typeof obj == 'object' && (Array.isArray(obj) || !Object.keys(obj).some(k => isNaN(k))));
}