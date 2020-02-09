import { postgres } from '../postgres/postgres';
import * as fs from 'fs-extra';
import { Block } from '../graphql/types';
import { exec } from 'child_process';
import * as fetch from 'node-fetch';

const numBlocksToImportFromGeth: number = parseInt(process.env.QUERY_ETHEREUM_GETH_NUM_BLOCKS_PER_IMPORT || '');
const gethBatchSize: number = parseInt(process.env.QUERY_ETHEREUM_GETH_BATCH_SIZE || '');
const gethWorkers: number = parseInt(process.env.QUERY_ETHEREUM_GETH_WORKERS || '');
const numBlocksToExportToPostgres: number = parseInt(process.env.QUERY_ETHEREUM_POSTGRES_NUM_BLOCKS_PER_EXPORT || '');

export async function startImport() {
    
    try {
        console.log('numBlocksToImportFromGeth', numBlocksToImportFromGeth);
        console.log('gethBatchSize', gethBatchSize);
        console.log('gethWorkers', gethWorkers);
        console.log('numBlocksToExportToPostgres', numBlocksToExportToPostgres);
        
        console.log('retrieving last block from postgres');

        const lastBlockNumberInPostgres: number = await getLastBlockNumberInPostgres();
        const lastBlockNumberInGeth: number = await getLastBlockNumberInGeth();

        console.log('lastBlockNumberInPostgres', lastBlockNumberInPostgres);
        console.log('lastBlockNumberInGeth', lastBlockNumberInGeth);

        await generateBlockCSV(lastBlockNumberInPostgres, lastBlockNumberInGeth);
        
        const blockCSVFileContents: string = (await fs.readFile('./ethereum-etl-data/blocks.csv')).toString();
    
        await importBlocks(blockCSVFileContents, lastBlockNumberInPostgres);
    }
    catch(error) {
        console.log(error);
    }    
}

function generateBlockCSV(lastBlockNumberInPostgres: number, lastBlockNumberInGeth: number) {
    return new Promise((resolve, reject) => {

        const endBlock = lastBlockNumberInPostgres + numBlocksToImportFromGeth - 1 > lastBlockNumberInGeth ? lastBlockNumberInGeth : lastBlockNumberInPostgres + numBlocksToImportFromGeth - 1;

        console.log('importing from geth');
        console.log(`docker run -v ${process.env.QUERY_ETHEREUM_ETHEREUM_ETL_DATA_DIR}:/ethereum-etl/output ethereum-etl:latest export_blocks_and_transactions --max-workers ${gethWorkers} --start-block ${lastBlockNumberInPostgres} --end-block ${endBlock} --provider-uri ${process.env.QUERY_ETHERUM_GETH_RPC_ORIGIN} --batch-size ${gethBatchSize} --blocks-output output/blocks.csv`);
        exec(`docker run -v ${process.env.QUERY_ETHEREUM_ETHEREUM_ETL_DATA_DIR}:/ethereum-etl/output ethereum-etl:latest export_blocks_and_transactions --max-workers ${gethWorkers} --start-block ${lastBlockNumberInPostgres} --end-block ${endBlock} --provider-uri ${process.env.QUERY_ETHERUM_GETH_RPC_ORIGIN} --batch-size ${gethBatchSize} --blocks-output output/blocks.csv`, (err, stdout, stderr) => {
            console.log('err', err);

            console.log('stdout', stdout);
            console.log('stderr', stderr);
        
            if (err) {
                reject(err);
            }

            resolve();
        });
    });    
}

// TODO we could probably send off all of these concurrently to the database, that might make things a bit faster
// TODO we might want to make this more intelligent, if the blocks are already in the database, we don't want to override them
// TODO this could occur any time this function is running concurrently with another copy of itself, say once we have multiple gql servers
async function importBlocks(
    blockCSVFileContents: string,
    from: number,
    skip: number = numBlocksToExportToPostgres
) {
    const blockCSVLines: ReadonlyArray<string> = blockCSVFileContents.split('\n');
    const blocks: ReadonlyArray<Block> = blockCSVLines.filter((blockCSVLine) => {
        const blockCSVFields: ReadonlyArray<string> = blockCSVLine.split(',');

        return parseInt(blockCSVFields[0]) >= from && parseInt(blockCSVFields[0]) < from + skip;
    }).map((blockCSVLine: string) => {
        const blockCSVFields: ReadonlyArray<string> = blockCSVLine.split(',');
    
        return {
            number: parseInt(blockCSVFields[0]),
            hash: blockCSVFields[1],
            nonce: blockCSVFields[3],
            transactionsRoot: blockCSVFields[6],
            transactionCount: parseInt(blockCSVFields[17]),
            stateRoot: blockCSVFields[7],
            receiptsRoot: blockCSVFields[8],
            extraData: blockCSVFields[13],
            gasLimit: parseInt(blockCSVFields[14]),
            gasUsed: parseInt(blockCSVFields[15]),
            timestamp: new Date(parseInt(blockCSVFields[16]) * 1000).toISOString(),
            logsBloom: blockCSVFields[5],
            difficulty: parseInt(blockCSVFields[10]),
            totalDifficulty: parseInt(blockCSVFields[11]),
            unclesHash: blockCSVFields[4]
        };
    }).sort((a, b) => {

        if (a.number < b.number) {
            return 1;
        }

        if (a.number > b.number) {
            return -1;
        }

        return 0;
    });

    if (blocks.length === 0) {
        console.log('importing complete')
        return;
    }

    const multiValueInsertClause = blocks.reduce((result, block, index) => {
        return {
            clause: `${result.clause} (
                    $${index * 15 + 1},
                    $${index * 15 + 2},
                    $${index * 15 + 3},
                    $${index * 15 + 4},
                    $${index * 15 + 5},
                    $${index * 15 + 6},
                    $${index * 15 + 7},
                    $${index * 15 + 8},
                    $${index * 15 + 9},
                    $${index * 15 + 10},
                    $${index * 15 + 11},
                    $${index * 15 + 12},
                    $${index * 15 + 13},
                    $${index * 15 + 14},
                    $${index * 15 + 15}
                )${index === blocks.length - 1 ? '' : ','}
            `,
            variables: [
                ...result.variables,
                block.number,
                block.hash,
                block.nonce,
                block.transactionsRoot,
                block.transactionCount,
                block.stateRoot,
                block.receiptsRoot,
                block.extraData,
                block.gasLimit,
                block.gasUsed,
                block.timestamp,
                block.logsBloom,
                block.difficulty,
                block.totalDifficulty,
                block.unclesHash
            ]
        };
    }, {
        clause: '',
        variables: []
    });

    // TODO we might be able to upsert by block number or something...we need to make sure there can never be duplicates, and it would be nice
    // TODO if there were duplicates, if this would just handle it and write over that data
    await postgres.query(`
        INSERT INTO 
            block 
                (
                    number,
                    hash,
                    nonce,
                    transactionsRoot,
                    transactionCount,
                    stateRoot,
                    receiptsRoot,
                    extraData,
                    gasLimit,
                    gasUsed,
                    timestamp,
                    logsBloom,
                    difficulty,
                    totalDifficulty,
                    unclesHash
                )
                VALUES
                    ${multiValueInsertClause.clause};
    `, multiValueInsertClause.variables);

    console.log(`imported blocks ${from} - ${from + skip - 1}`);
    console.log(`${((from + skip) / 9300000 * 100).toFixed(2)}% complete`);

    // if (blocks.length < skip) {
    //     console.log('importing complete');
    //     return;
    // }

    await importBlocks(blockCSVFileContents, from + skip);
}

// TODO this isn't really the last block number in postgres, it's the next block number not in postgres, or the last number not in postgres
async function getLastBlockNumberInPostgres(): Promise<number> {
    const response = await postgres.query(`SELECT number FROM block ORDER BY number DESC LIMIT 1;`);

    if (response.rows.length === 0) {
        return 0;
    }
    else {
        return parseInt(response.rows[0].number) + 1;
    }
}

// TODO I am not sure if eth_syncing will return meaningful data once the node is synced, so we might have to
// TODO switch at that point to using eth_blockNumber
async function getLastBlockNumberInGeth(): Promise<number> {
    // curl --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://172.31.13.33:8545
    // curl --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' -H "Content-Type: application/json" http://172.31.13.33:8545

    const response = await fetch(`${process.env.QUERY_ETHERUM_GETH_RPC_ORIGIN}?data='{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const responseJSON = await response.json();

    console.log('getLastBlockNumberInGeth', getLastBlockNumberInGeth);

    return parseInt(responseJSON.result.currentBlock);
}