import {
    getTotalETHFeesForBlocksBetweenDates
} from './services/utilities';
import { 
    ETH
} from '../index.d';

(async () => {
    const totalETHFees: ETH = await getTotalETHFeesForBlocksBetweenDates(new Date('2020-01-01'), new Date('2020-01-02'));

    console.log('totalETHFees', totalETHFees);
})();
