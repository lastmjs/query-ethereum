// TODO we want to create a GraphQL server...
// TODO we will create our own custom schema that has powerful queries, stats for sums, averages, maybe even moving averages
// TODO start with creating a sql database from the transaction data that we have

import {
    getTotalETHFeesForBlocksBetweenDates,
    getTotalETHSentForBlocksBetweenDates,
    getBlocks,
    writeFeesToPriceInfoForDays
} from './services/utilities';
import { 
    ETH
} from '../index.d';
import {
    startImport
} from './services/import-ethereum-node-data-into-postgres';

(async () => {

    await startImport();

    // const startDate: Date = new Date('2016-01-01T00:00:00.000Z');
    // const endDate: Date = new Date('2016-01-07T00:00:00.000Z');

    // const feesToPriceInfoForDays = await writeFeesToPriceInfoForDays(startDate, 670);

    // console.log('feesToPriceInfoForDays', feesToPriceInfoForDays)

    // console.log('startDate', startDate);
    // console.log('endDate', endDate);
    
    // const totalETHFees: ETH = await getTotalETHFeesForBlocksBetweenDates(startDate, endDate);
    // const totalETHSent: ETH = await getTotalETHSentForBlocksBetweenDates(startDate, endDate);    

    // console.log('totalETHFees', totalETHFees);
    // console.log('totalETHSent', totalETHSent);

    // console.log('Total demand for ETH', totalETHFees + totalETHSent);

    // console.log('Percentage demand for fees', (Number(totalETHFees) / Number(totalETHSent) * 100).toFixed(2) + '%');

    // const blocks = await getBlocks(0, 600);

    // console.log(blocks)
    // console.log(blocks.length);
})();
