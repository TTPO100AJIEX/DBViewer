import { config, TargetDatabase, InternalDatabase, Redis } from "common/index.js";
TargetDatabase.end(); Redis.end();

await InternalDatabase.query_multiple([

]);

console.log(`Created tables`);


InternalDatabase.end();