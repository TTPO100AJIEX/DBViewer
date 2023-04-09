import bcrypt from 'bcrypt';
import { config, TargetDatabase, InternalDatabase, Redis } from "common/index.js";
TargetDatabase.end(); Redis.end();

await InternalDatabase.query_multiple([
    `INSERT INTO users (login, password, read, insert, update, delete, admin) VALUES ('TTPO100AJIEX', '${await bcrypt.hash("123321", config.bcrypt.saltRounds)}', 'f', 'f', 'f', 'f', 't')`
]);

console.log(`Created tables`);


InternalDatabase.end();