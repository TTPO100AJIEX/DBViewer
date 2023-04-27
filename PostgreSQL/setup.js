import { InternalDatabase } from "common/postgreSQL/postgreSQL.js";

import fs from 'fs';
await InternalDatabase.query(fs.readFileSync("PostgreSQL/setup.sql", "utf-8"));
console.log(`Created tables`);


InternalDatabase.end();