import { Pool } from 'pg';

// -e POSTGRES_PASSWORD=password

export const postgres = new Pool({
    database: 'query_ethereum',
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    // password: 'password',
    ssl: false
});