import config from "common/configs/config.js";
import { InternalDatabase } from "common/postgreSQL/postgreSQL.js";
import bcrypt from 'bcrypt';

const usersInsertQuery = `INSERT INTO users (login, password, read, insert, update, delete, admin) VALUES ($1, $2, 'f', 'f', 'f', 'f', 't')`;
await InternalDatabase.query(usersInsertQuery, [ config.default_account.login, await bcrypt.hash(config.default_account.password, config.bcrypt.saltRounds) ]);

console.log(`Filled tables`);


InternalDatabase.end();