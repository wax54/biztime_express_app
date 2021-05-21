/** Database setup for BizTime. */
const { Client } = require('pg');
const { user, password, host, port} = require('./dbSecrets.json');

let DB_URI = `postgresql://${user}:${password}@${host}:${port}/`;

if (process.env.NODE_ENV === 'test'){
    DB_URI += 'biztime_test';
}else{
    DB_URI += 'biztime';
}

let db = new Client({ connectionString: DB_URI });

db.connect();

module.exports = db;