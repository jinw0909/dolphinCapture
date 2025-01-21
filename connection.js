const mysql = require('mysql2/promise');
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
}

const pool = mysql.createPool(dbConfig);

// Function to log the connection status
async function checkConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the DB');
        connection.release();
    } catch (error) {
        console.error('Error connecting to the DB:', error);
    }
}
async function query(sql, params) {
    const [results, ] = await pool.execute(sql, params);
    return results;
}

checkConnection();

module.exports = {
    query,
    pool
};