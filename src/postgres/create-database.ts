// throw new Error('This will drop all tables!');

import { postgres } from './postgres';

(async () => {

    // TODO You will have to manually create the query_ethereum database before you can execute these commands
    // TODO we might want to use underscores to separate words

    await postgres.query(`
        DROP TABLE block;
    `);

    // TODO make number unique
    await postgres.query(`
        CREATE TABLE block (
            number              bigint      not null    unique,
            hash                text        not null,
            nonce               text        not null,
            transactionsroot    text        not null,
            transactioncount    int         not null,
            stateroot           text        not null,
            receiptsroot        text        not null,
            extradata           text        not null,
            gaslimit            bigint      not null,
            gasused             bigint      not null,
            timestamp           timestamp   not null,
            logsbloom           text        not null,
            difficulty          bigint      not null,
            totaldifficulty     text        not null,
            uncleshash          text        not null
        );

        CREATE INDEX block_number_index ON block (number);
        CREATE INDEX block_hash_index ON block (hash);
        CREATE INDEX block_nonce_index ON block (nonce);
        CREATE INDEX block_transactionsroot_index ON block (transactionsroot);
        CREATE INDEX block_transactioncount_index ON block (transactioncount);
        CREATE INDEX block_stateroot_index ON block (stateroot);
        CREATE INDEX block_receiptsroot_index ON block (receiptsroot);
        CREATE INDEX block_extradata_index ON block (extradata);
        CREATE INDEX block_gaslimit_index ON block (gaslimit);
        CREATE INDEX block_gasused_index ON block (gasused);
        CREATE INDEX block_timestamp_index ON block (timestamp);
        CREATE INDEX block_logsbloom_index ON block (logsbloom);
        CREATE INDEX block_difficulty_index ON block (difficulty);
        CREATE INDEX block_totaldifficulty_index ON block (totaldifficulty);
        CREATE INDEX block_uncleshash_index ON block (uncleshash);
    `);

})();
