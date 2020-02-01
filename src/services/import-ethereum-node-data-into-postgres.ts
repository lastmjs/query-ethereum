import { postgres } from '../postgres/postgres';
import { gqlRequest } from '../graphql/graphql';

export async function startImport() {
    
    const lastBlockNumberinPostgres: number = await getLastBlockNumberInPostgres();
    await importBlocks(lastBlockNumberinPostgres);

}


// TODO we need to put a base case in here
// TODO we might want to make this more intelligent, if the blocks are already in the database, we don't want to override them
// TODO this could occur any time this function is running concurrently with another copy of itself, say once we have multiple gql servers
async function importBlocks(
    from: number,
    skip: number = 100
) {
    // TODO this will never terminate, but right now I am running it manually

    const gqlResult = await gqlRequest(`
        query {
            blocks(from: ${from}, to: ${from + skip}) {
                number
                hash
                nonce
                transactionsRoot
                transactionCount
                stateRoot
                receiptsRoot
                extraData
                gasLimit
                gasUsed
                timestamp
                logsBloom
                mixHash
                difficulty
                totalDifficulty
                ommerCount
                ommerHash            
            }
        }
    `);

    const multiValueInsertClause = gqlResult.data.blocks.reduce((result, block, index) => {
        return {
            clause: `${result.clause} (
                    $${index * 17 + 1},
                    $${index * 17 + 2},
                    $${index * 17 + 3},
                    $${index * 17 + 4},
                    $${index * 17 + 5},
                    $${index * 17 + 6},
                    $${index * 17 + 7},
                    $${index * 17 + 8},
                    $${index * 17 + 9},
                    $${index * 17 + 10},
                    $${index * 17 + 11},
                    $${index * 17 + 12},
                    $${index * 17 + 13},
                    $${index * 17 + 14},
                    $${index * 17 + 15},
                    $${index * 17 + 16},
                    $${index * 17 + 17}
                )${index === gqlResult.data.blocks.length - 1 ? '' : ','}
            `,
            variables: [
                ...result.variables,
                parseInt(block.number),
                block.hash,
                block.nonce,
                block.transactionsRoot,
                block.transactionCount === null ? 0 : block.transactionCount,
                block.stateRoot,
                block.receiptsRoot,
                block.extraData,
                parseInt(block.gasLimit),
                parseInt(block.gasUsed),
                new Date(parseInt(block.timestamp) * 1000).toISOString(),
                block.logsBloom,
                block.mixHash,
                parseInt(block.difficulty),
                parseInt(block.totalDifficulty),
                block.ommerCount === null ? 0 : block.ommerCount,
                block.ommerHash
            ]
        };
    }, {
        clause: '',
        variables: []
    });

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
                    mixHash,
                    difficulty,
                    totalDifficulty,
                    ommerCount,
                    ommerHash
                )
                VALUES
                    ${multiValueInsertClause.clause};
    `, multiValueInsertClause.variables);

    console.log(`imported blocks ${from} - ${from + skip}`);
    console.log(`${((from + skip) / 9300000 * 100).toFixed(2)}% complete`);

    if (gqlResult.data.blocks.length < skip) {
        console.log('importing complete');
        return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await importBlocks(from + skip + 1);
}

async function getLastBlockNumberInPostgres(): Promise<number> {
    const response = await postgres.query(`SELECT number FROM block ORDER BY number DESC LIMIT 1`);

    if (response.rows.length === 0) {
        return 0;
    }
    else {
        return parseInt(response.rows[0].number) + 1;
    }
}