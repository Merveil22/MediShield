import mysql from 'mysql2/promise';
import 'dotenv/config';

// Un "pool" de connexions est préférable à une connexion unique :
// il gère plusieurs requêtes simultanées sans se bloquer, ce qui
// est indispensable dès qu'il y a plusieurs admins ou plusieurs
// requêtes API en parallèle.
export const pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10
});
