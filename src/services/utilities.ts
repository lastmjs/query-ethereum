import { 
    Block,
    GQLResult,
    WEI,
    Transaction,
    ETH
} from '../../index.d';
import {
    gqlRequest
} from './graphql';

export async function getTotalETHFeesForBlocksBetweenDates(startDate: Date, endDate: Date): Promise<ETH> {
    const blocks: ReadonlyArray<Block> = await getBlocksBetweenDates(startDate, endDate);
    const totalETHFeesForBlocks: ETH = getTotalETHFeesForBlocks(blocks);

    return totalETHFeesForBlocks;
}

function getTotalETHFeesForBlocks(blocks: ReadonlyArray<Block>): ETH {
    const totalWEIFeesForBlocks: WEI = blocks.reduce((result: WEI, block: Readonly<Block>) => {
        return result + getTotalWEIFeesForBlock(block);
    }, 0n);

    const totalETHFeesForBlocks: ETH = convertWEIToETH(totalWEIFeesForBlocks);

    return totalETHFeesForBlocks;
}

function convertWEIToETH(wei: WEI): ETH {
    return wei / (10n ** 18n);
}

async function getBlocksBetweenDates(startDate: Date, endDate: Date): Promise<ReadonlyArray<Block>> {
    // TODO we will do a quick binary search
    // TODO eventually having all of this data in a sql database would really be nice and ideal for this type of task

    // TODO grab the first block...if it is less than the startDate, add 10 blocks and try again
    // TODO if that is less than the start date, add 100 blocks and then try again
    // TODO keep going up orders of magnitude until you are equal to or greater than the start date

    const startBlock: Readonly<Block> = await getBlockForDate(startDate);
    const endBlock: Readonly<Block> = await getBlockForDate(endDate);

    console.log('startBlock timestamp', new Date(parseInt(startBlock.timestamp) * 1000));
    console.log('endBlock timestamp', new Date(parseInt(endBlock.timestamp) * 1000));

    const blocksBetweenDates: ReadonlyArray<Block> = await getBlocks(parseInt(startBlock.number), parseInt(endBlock.number));

    return blocksBetweenDates;
}

async function getBlockForDate(
    date: Date,
    firstBlockNumber: number = 0,
    lastBlockNumber: number = -1
): Promise<Readonly<Block>> {

    const firstBlock: Readonly<Block> = await getBlockByNumber(firstBlockNumber);
    const lastBlock: Readonly<Block> = await getBlockByNumber(lastBlockNumber);

    const firstBlockTimestampDate: Date = new Date(parseInt(firstBlock.timestamp) * 1000);
    const lastBlockTimestampDate: Date = new Date(parseInt(lastBlock.timestamp) * 1000);

    if (
        parseInt(firstBlock.number) === parseInt(lastBlock.number)
    ) {
        return firstBlock;
    }

    if (date === firstBlockTimestampDate) {
        return firstBlock;
    }

    if (date === lastBlockTimestampDate) {
        return lastBlock;
    }

    if (
        date > firstBlockTimestampDate &&
        date < lastBlockTimestampDate
    ) {
        return await getBlockForDate(date, parseInt(firstBlock.number), Math.floor((parseInt(lastBlock.number) + parseInt(firstBlock.number)) / 2));
    }

    return await getBlockForDate(date, parseInt(lastBlock.number), parseInt(lastBlock.number) * 2);

    // if (
    //     date < firstBlockTime
    // )

    // console.log('block', block);

    // if (block === null) {
    //     return await getBlockForDate(date, lastBlockTimestampDate, lastBlockNumber, Math.floor(currentBlockNumber / 1.5));                
    // }

    // const blockTimestampDate: Date = new Date(parseInt(block.timestamp) * 1000);

    // console.log('date', date);
    // console.log('lastBlockNumber', lastBlockNumber);
    // console.log('currentBlockNumber', currentBlockNumber);
    // console.log('blockTimestampDate', blockTimestampDate);
    // console.log();

    // if (blockTimestampDate === date) {
    //     return block;
    // }

    // if (walkingBack === false) {
    //     if (blockTimestampDate < date) {
    //         return await getBlockForDate(date, blockTimestampDate, currentBlockNumber, currentBlockNumber === 0 ? 2 : currentBlockNumber * 2, false);
    //     }
    
    //     if (blockTimestampDate > date) {
    //         return await getBlockForDate(date, lastBlockTimestampDate, lastBlockNumber, Math.floor((currentBlockNumber - lastBlockNumber) / 2), true);
    //     }
    // }

    // if (walkingBack === true) {
    //     console.log('lastBlockNumber', lastBlockNumber);
    //     console.log('currentBlockNumber', currentBlockNumber);
    //     // if (lastBlockNumber <= currentBlockNumber) {
    //     //     return block;
    //     // }

    //     // if (currentBlockNumber < 0) {
    //     //     return block;
    //     // }

    //     if (
    //         lastBlockNumber === currentBlockNumber ||
    //         lastBlockNumber === currentBlockNumber - 1 ||
    //         lastBlockNumber === currentBlockNumber + 1
    //     ) {
    //         return block;
    //     }

    //     if (blockTimestampDate < date) {
    //         return await getBlockForDate(date, lastBlockTimestampDate, lastBlockNumber, Math.floor((currentBlockNumber - lastBlockNumber) / 2), true);
    //     }

    //     if (blockTimestampDate > date) {
    //         return await getBlockForDate(date, lastBlockTimestampDate, currentBlockNumber, (currentBlockNumber * 2) + lastBlockNumber, true);
    //     }
    // }

    // throw new Error('This should never happen');
}

async function getBlockByNumber(blockNumber: number): Promise<Readonly<Block>> {
    const gqlResult: Readonly<GQLResult> = await gqlRequest(`
        query {
            block${blockNumber === -1 ? '' : `(number: ${blockNumber})`} {
                number
                timestamp
            }
        }
    `);

    const block: Readonly<Block> = gqlResult.data.block;

    if (block === null) {
        return await getBlockByNumber(-1);
    }

    return gqlResult.data.block;
}

// async function getEndBlockForDate(
//     date: Date,
//     lastBlockNumber: number = 0,
//     currentBlockNumber: number = 0
// ): Promise<Readonly<Block>> {
//     const gqlResult: Readonly<GQLResult> = await gqlRequest(`
//         query {
//             block(number: ${currentBlockNumber}) {
//                 timestamp
//                 number
//             }
//         }
//     `);

//     const block: Readonly<Block> = gqlResult.data.block;
//     const blockTimestampDate: Date = new Date(parseInt(block.timestamp) * 1000);

//     if (blockTimestampDate === date) {
//         return block;
//     }

//     if (blockTimestampDate > date) {
//         return await getStartBlockForDate(date, currentBlockNumber, currentBlockNumber === 0 ? 10 : currentBlockNumber * 10);
//     }

//     if (blockTimestampDate < date) {
//         if (lastBlockNumber >= currentBlockNumber) {
//             return block;
//         }
        
//         return await getStartBlockForDate(date, lastBlockNumber, Math.floor(currentBlockNumber / 2));
//     }

//     throw new Error('This should never happen');
// }

// TODO we might want to implement paging here...
async function getBlocks(from: number, to: number): Promise<ReadonlyArray<Block>> {
    const gqlResult: Readonly<GQLResult> = await gqlRequest(`
        query {
            blocks(from: ${from}, to: ${to}) {
                transactions {
                    gasUsed
                    gasPrice
                }
            }
        }
    `);
    
    return gqlResult.data.blocks;
}

function getTotalWEIFeesForBlock(block: Readonly<Block>): WEI {
    return block.transactions.reduce((result: WEI, transaction: Readonly<Transaction>) => {
        return result + getWEIFeeForTransaction(transaction);
    }, 0n);
}

function getWEIFeeForTransaction(transaction: Readonly<Transaction>): WEI {
    return BigInt(transaction.gasPrice) * BigInt(transaction.gasUsed);
}