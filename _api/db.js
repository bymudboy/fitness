// db.js
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // seu usuário do MySQL
    password: '', // sua senha do MySQL (geralmente vazia no XAMPP)
    database: 'fitness'
});
module.exports = pool;