import { postgres } from './postgres';

(async () => {

    // TODO You will have to manually create the query_ethereum database before you can execute these commands

    await postgres.query(`
        CREATE TABLE block (
            number              bigint  not null,
            hash                text  not null,
            nonce               text  not null,
            transactionsRoot    text  not null,
            transactionCount    int  not null,
            stateRoot           text  not null,
            receiptsRoot        text  not null,
            extraData           text  not null,
            gasLimit            bigint  not null,
            gasUsed             bigint  not null,
            timestamp           date  not null,
            logsBloom           text  not null,
            mixHash             text  not null,
            difficulty          bigint  not null,
            totalDifficulty     bigint  not null,
            ommerCount          int  not null,
            ommerHash           text  not null
        );
    `);

})();
