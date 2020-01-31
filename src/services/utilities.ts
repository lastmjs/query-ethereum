import { 
    Block,
    GQLResult,
    WEI,
    Transaction,
    ETH,
    FeesToPriceInfoForDay
} from '../../index.d';
import {
    gqlRequest
} from '../graphql/graphql';
import * as fs from 'fs-extra';

const priceInfoForDays = JSON.parse(fs.readFileSync('./stats/etherscan-price-data.json'));

export async function writeFeesToPriceInfoForDays(
    startDay: Date,
    numDays: number
): Promise<void> {

    await fs.writeFile('./stats/fees-to-price-info-for-day.csv', `Day, Fees in ETH, Price in USD\n`);

    // return await new Array(numDays).fill(0).reduce(async (result: Promise<ReadonlyArray<FeesToPriceInfoForDay>>, x, index) => {
    
    for (let i=0; i < numDays; i++) {
        const startDate: Date = new Date(startDay.getTime() + 1000 * 60 * 60 * 24 * i);
        const endDate: Date = new Date(startDay.getTime() + 1000 * 60 * 60 * 24 * (i + 1));
    
        const blocks: ReadonlyArray<Block> = await getBlocksBetweenDates(startDate, endDate);
        const totalETHFeesForBlocks: ETH = getTotalETHFeesForBlocks(blocks);
    
        const priceInfoForDay = priceInfoForDays.find((priceInfoForDay: any) => {
            const priceInfoForDayDate = new Date(priceInfoForDay.UnixTimeStamp * 1000);
    
            return (
                priceInfoForDayDate.getFullYear() === startDate.getFullYear() &&
                priceInfoForDayDate.getMonth() === startDate.getMonth() &&
                priceInfoForDayDate.getDate() === startDate.getDate()
            );
        });
    
        const feesToPriceInfoForDay: Readonly<FeesToPriceInfoForDay> = {
            dateInDay: startDate,
            priceInUSD: priceInfoForDay.Value,
            feesInETH: totalETHFeesForBlocks
        };

        await fs.appendFile('./stats/fees-to-price-info-for-day.csv', `${feesToPriceInfoForDay.dateInDay.toISOString()}, ${feesToPriceInfoForDay.feesInETH}, ${feesToPriceInfoForDay.priceInUSD}\n`);
    }


        // const resolvedResult = await result;

        // return [...resolvedResult, {
        //     dateInDay: startDate,
        //     priceInUSD: priceInfoForDay.Value,
        //     feesInETH: totalETHFeesForBlocks
        // }];
    // }, Promise.resolve([]));
}

export async function getTotalETHFeesForBlocksBetweenDates(startDate: Date, endDate: Date): Promise<ETH> {
    const blocks: ReadonlyArray<Block> = await getBlocksBetweenDates(startDate, endDate);
    const totalETHFeesForBlocks: ETH = getTotalETHFeesForBlocks(blocks);

    return totalETHFeesForBlocks;
}

export async function getTotalETHSentForBlocksBetweenDates(startDate: Date, endDate: Date): Promise<ETH> {
    const blocks: ReadonlyArray<Block> = await getBlocksBetweenDates(startDate, endDate);
    const totalETHSentForBlocks: ETH = getTotalETHSentForBlocks(blocks);

    return totalETHSentForBlocks;
}

function getTotalETHFeesForBlocks(blocks: ReadonlyArray<Block>): ETH {
    const totalWEIFeesForBlocks: WEI = blocks.reduce((result: WEI, block: Readonly<Block>) => {
        return result + getTotalWEIFeesForBlock(block);
    }, 0n);

    const totalETHFeesForBlocks: ETH = convertWEIToETH(totalWEIFeesForBlocks);

    return totalETHFeesForBlocks;
}

function getTotalETHSentForBlocks(blocks: ReadonlyArray<Block>): ETH {
    const totalWEISentForBlocks: WEI = blocks.reduce((result: WEI, block: Readonly<Block>) => {
        return result + getTotalWEISentForBlock(block);
    }, 0n);

    const totalETHSentForBlocks: ETH = convertWEIToETH(totalWEISentForBlocks);

    return totalETHSentForBlocks;
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

    console.log('startBlock number', parseInt(startBlock.number));
    console.log('startBlock timestamp', new Date(parseInt(startBlock.timestamp) * 1000));
   
    console.log('endBlock number', parseInt(endBlock.number));
    console.log('endBlock timestamp', new Date(parseInt(endBlock.timestamp) * 1000));

    const blocksBetweenDates: ReadonlyArray<Block> = await getBlocks(parseInt(startBlock.number), parseInt(endBlock.number));

    console.log('blocksBetweenDates.length', blocksBetweenDates.length);

    return blocksBetweenDates;
}

async function getBlockForDate(
    date: Date,
    firstBlockNumber: number = 1,
    lastBlockNumber: number = -1,
    previousLastBlockNumber: number = -1
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
        return await getBlockForDate(
            date, 
            parseInt(firstBlock.number), 
            Math.floor((parseInt(lastBlock.number) + parseInt(firstBlock.number)) / 2),
            previousLastBlockNumber
        );
    }

    if (
        lastBlockNumber === previousLastBlockNumber
    ) {
        return firstBlock;
    }

    return await getBlockForDate(
        date, 
        parseInt(lastBlock.number), 
        2 * parseInt(lastBlock.number) - parseInt(firstBlock.number),
        2 * parseInt(lastBlock.number) - parseInt(firstBlock.number)
    );
}

async function getBlockByNumber(blockNumber: number): Promise<Readonly<Block>> {
    const gqlResult: Readonly<GQLResult> = await gqlRequest(`
        query {
            block${blockNumber === -1 ? '(number: 4500000)' : `(number: ${blockNumber})`} {
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

export async function getBlocks(
    from: number,
    to: number,
    originalTo: number | 'NOT_SET' = 'NOT_SET',
    allBlocks: ReadonlyArray<Block> = []
): Promise<ReadonlyArray<Block>> {
    // console.log('from', from);
    // console.log('to', to);
    // console.log('originalTo', originalTo);

    const gqlResult: Readonly<GQLResult> = await gqlRequest(`
        query {
            blocks(from: ${originalTo === 'NOT_SET' ? from : from + 1}, to: ${originalTo === 'NOT_SET' && to >= from + 1000 ? from + 1000 : to}) {
                transactions {
                    gasUsed
                    gasPrice
                    value
                }
            }
        }
    `);

    const someBlocks: ReadonlyArray<Block> = gqlResult.data.blocks;

    if (
        to >= originalTo ||
        to < from + 1000
    ) {
        return [...allBlocks, ...someBlocks];
    }

    return await getBlocks(from + 1000, originalTo === 'NOT_SET' && to >= from + 1000 ? from + 2000 : to + 1000, originalTo === 'NOT_SET' ? to : originalTo, [...allBlocks, ...someBlocks]);
}

function getTotalWEIFeesForBlock(block: Readonly<Block>): WEI {
    return block.transactions.reduce((result: WEI, transaction: Readonly<Transaction>) => {
        return result + getWEIFeeForTransaction(transaction);
    }, 0n);
}

function getWEIFeeForTransaction(transaction: Readonly<Transaction>): WEI {
    return BigInt(transaction.gasPrice) * BigInt(transaction.gasUsed);
}

function getTotalWEISentForBlock(block: Readonly<Block>): WEI {
    return block.transactions.reduce((result: WEI, transaction: Readonly<Transaction>) => {
        return result + BigInt(transaction.value);
    }, 0n);
}