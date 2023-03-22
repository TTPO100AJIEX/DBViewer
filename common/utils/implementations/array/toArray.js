import isArray from "./isArray.js";

export default function toArray(obj)
{
    if (Array.isArray(obj)) return obj;
    if (!isArray(obj)) return [ ];
    let answer = new Array(Object.keys(obj).map(e => Number(e)).reduce((prev, cur) => Math.max(prev, cur), 0));
    for (const key in obj) answer[key] = obj[key];
    return answer;
}