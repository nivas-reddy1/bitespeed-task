const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      "phoneNumber" VARCHAR(20),
      email VARCHAR(255),
      "linkedId" INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      "linkPrecedence" VARCHAR(10) NOT NULL CHECK ("linkPrecedence" IN ('primary', 'secondary')),
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL
    );
  `);
  console.log('db initialized contacts created');
};

module.exports = { pool, initDB };