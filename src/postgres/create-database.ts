// throw new Error('This will drop all tables!');

import { postgres } from './postgres';

(async () => {

    // TODO You will have to manually create the query_ethereum database before you can execute these commands
    // TODO we might want to use underscores to separate words

    await postgres.query(`
        DROP TABLE block;
    `);

    await postgres.query(`
        CREATE TABLE block (
            number              bigint  not null,
            hash                text  not null,
            nonce               text  not null,
            transactionsroot    text  not null,
            transactioncount    int  not null,
            stateroot           text  not null,
            receiptsroot        text  not null,
            extradata           text  not null,
            gaslimit            bigint  not null,
            gasused             bigint  not null,
            timestamp           timestamp  not null,
            logsbloom           text  not null,
            mixhash             text  not null,
            difficulty          bigint  not null,
            totaldifficulty     text  not null,
            ommercount          int  not null,
            ommerhash           text  not null
        );
    `);

})();
