import { Pool } from 'pg';

export const postgres = new Pool({
    database: 'query_ethereum',
    host: process.env.QUERY_ETHEREUM_DB_HOST,
    port: parseInt(process.env.QUERY_ETHEREUM_DB_PORT || ''),
    user: 'postgres',
    password: process.env.QUERY_ETHEREUM_DB_PASSWORD,
    ssl: false
});