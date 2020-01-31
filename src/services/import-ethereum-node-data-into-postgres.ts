import { postgres } from '../postgres/postgres';
import { gqlRequest } from '../graphql/graphql';

export async function startImport() {
    
    await importBlocks();

}

async function importBlocks(
    from: number = 0
    // to: number = 0
) {
    // TODO this will never terminate, but right now I am running it manually

    const modifiedFrom: number = from === 0 ? await getLastBlockNumberInPostgres() : from;
    const modifiedTo: number = modifiedFrom + 100;

    const gqlResult = await gqlRequest(`
        query {
            blocks(from: ${modifiedFrom + 1}, to: ${modifiedTo}) {
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

    for (let i=0; i < gqlResult.data.blocks.length; i++) {
        const block: Readonly<Block> = gqlResult.data.blocks[i];

        console.log(`importing block ${parseInt(block.number)}`);

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
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7,
                            $8,
                            $9,
                            $10,
                            $11,
                            $12,
                            $13,
                            $14,
                            $15,
                            $16,
                            $17
                        );
        `, [
            parseInt(block.number),
            block.hash,
            block.nonce,
            block.transactionsRoot,
            block.transactionCount,
            block.stateRoot,
            block.receiptsRoot,
            block.extraData,
            parseInt(block.gasLimit),
            parseInt(block.gasUsed),
            new Date(parseInt(block.timestamp) * 1000),
            block.logsBloom,
            block.mixHash,
            parseInt(block.difficulty),
            parseInt(block.totalDifficulty),
            block.ommerCount,
            block.ommerHash
        ]);
    }

    await importBlocks(from + 100);
}

async function getLastBlockNumberInPostgres(): Promise<number> {
    const response = await postgres.query(`SELECT number FROM block ORDER BY number DESC LIMIT 1`);

    if (response.rows.length === 0) {
        return 0;
    }
    else {
        return parseInt(response.rows[0].number);
    }
}