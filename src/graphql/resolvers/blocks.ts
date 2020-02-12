import {
    BlockGroup,
    Block,
    Block_Grouping
} from '../types';
import { 
    GraphQLResolveInfo,
    OperationDefinitionNode,
    SelectionSetNode,
    SelectionNode
} from 'graphql';
import { postgres } from '../../postgres/postgres';
import BigNumber from 'bignumber.js';
import {
    BlocksForDay
} from '../../../index.d';

export async function blocks(
    obj: any, 
    args: any, 
    context: any, 
    info: Readonly<GraphQLResolveInfo>
): Promise<ReadonlyArray<BlockGroup>> {
    const first: number | undefined = args.first;
    const last: number | undefined = args.last;
    const groupBy: Block_Grouping | undefined = args.groupBy;
    const wherePresent: boolean = args.where !== undefined && args.where !== null;

    const selectionSetObject = getSelectionSetObjectFromInfo(info);

    // console.log('selectionSetObject', selectionSetObject);

    const whereClauseResult: Readonly<WhereClauseResult> | 'NO_WHERE_PRESENT' = wherePresent ? constructWhereClause(args, 1) : 'NO_WHERE_PRESENT';

    await postgres.query('BEGIN');

    const selectClause = ['timestamp', ...getSelectClause(selectionSetObject)];

    // console.log(selectClause.length);
    // console.log(selectClause.join(','))
    // console.log('selectClause', selectClause);

    // TODO we will want to optimize eventually and only select what is necessary...but this will require sql injection sanitization and 
    // TODO selecting extra fields for the stats selection sets
    // TODO use variables for column names?
    // TODO use the check thingy
    const sqlQuery1: string = `DECLARE liahona SCROLL CURSOR FOR SELECT ${selectClause.join(',')} FROM block ${whereClauseResult === 'NO_WHERE_PRESENT' ? '' : `WHERE ${whereClauseResult.whereClause}`} ORDER BY timestamp DESC;`;

    console.log(sqlQuery1);

    await postgres.query({
        text: sqlQuery1,
        values: [...(whereClauseResult === 'NO_WHERE_PRESENT' ? [] : whereClauseResult.variables)]
    });

    const sqlQuery2: string = `${getFetchStatement(first, last)};`;

    const sqlQueryResponse2 = await postgres.query({
        text: sqlQuery2,
        values: []
    });

    const sqlQueryResponse = sqlQueryResponse2.length === 3 ? sqlQueryResponse2[2] : sqlQueryResponse2;

    await postgres.query('COMMIT');

    if (groupBy === 'SECOND') {
        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameSecond);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    if (groupBy === 'MINUTE') {
        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameMinute);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    if (groupBy === 'HOUR') {
        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameHour);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    if (groupBy === 'DAY') {

        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameDay);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    if (groupBy === 'WEEK') {

        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameWeek);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    if (groupBy === 'MONTH') {

        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameMonth);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    if (groupBy === 'YEAR') {

        const blocksForDays: ReadonlyArray<BlocksForDay> = getBlocksForDays(sqlQueryResponse.rows, datesInSameYear);

        return blocksForDays.map((blocksForDay) => {
            return getBlockGroup(blocksForDay.blocks, selectionSetObject);
        });
    }

    return [
        getBlockGroup(sqlQueryResponse.rows, selectionSetObject)
    ];
}

function getBlockGroup(blocks: Array<Block>, selectionSetObject: any): Readonly<BlockGroup> {
    return         {
        startDate: new Date(blocks[0].timestamp),
        endDate: new Date(blocks[blocks.length - 1].timestamp),
        ...(selectionSetObject.blocks.stats ? {
            stats: {
                ...(selectionSetObject.blocks.stats.total ? {
                    total: getStats(blocks, selectionSetObject.blocks.stats, () => new BigNumber(blocks.length)).total
                }: {}),
                ...(selectionSetObject.blocks.stats.average ? {
                    average: getStats(blocks, selectionSetObject.blocks.stats, () => new BigNumber(blocks.length)).average
                }: {}),
                ...(selectionSetObject.blocks.stats.transactionCount ? {
                    transactionCount: getStats(blocks, selectionSetObject.blocks.stats.transactionCount, () => {
                        return blocks.reduce((result, row) => {
                            return result.plus(row.transactioncount);
                        }, new BigNumber(0));            
                    })    
                }: {}),
                ...(selectionSetObject.blocks.stats.gasLimit ? {
                    gasLimit: getStats(blocks, selectionSetObject.blocks.stats.gasLimit, () => {
                        return blocks.reduce((result, row) => {
                            return result.plus(row.gaslimit);
                        }, new BigNumber(0));            
                    }),
                } : {}),
                ...(selectionSetObject.blocks.stats.gasUsed ? {
                    gasUsed: getStats(blocks, selectionSetObject.blocks.stats.gasUsed, () => {
                        return blocks.reduce((result, row) => {
                            return result.plus(row.gasused);
                        }, new BigNumber(0));            
                    }),
                } : {}),
                ...(selectionSetObject.blocks.stats.difficulty ? {
                    difficulty: getStats(blocks, selectionSetObject.blocks.stats.difficulty, () => {
                        return blocks.reduce((result, row) => {
                            return result.plus(row.difficulty);
                        }, new BigNumber(0));            
                    }),
                }: {})
            }
        } : {}),
        ...(selectionSetObject.blocks.items ? { items: blocks } : {})
    };
}

// TODO sql injection, fix the first and last interpolation
function getFetchStatement(first: number | undefined, last: number | undefined): string {
    if (first !== undefined) {
        return `MOVE FORWARD ALL FROM liahona; MOVE BACKWARD ${first === 0 ? first : first + 1} FROM liahona; FETCH FORWARD ${first} FROM liahona`;
    }

    if (last !== undefined) {
        return `FETCH FORWARD ${last} FROM liahona`;
    }

    return 'FETCH ALL FROM liahona';
}

type WhereClauseResult = {
    whereClause: string;
    variables: ReadonlyArray<any>;
};

const supportedFieldNames = [
    'number',
    'hash',
    'nonce',
    'transactionsroot',
    'transactioncount',
    'stateroot',
    'receiptsroot',
    'extradata',
    'gaslimit',
    'gasused',
    'timestamp',
    'logsbloom',
    'difficulty',
    'totaldifficulty',
    'uncleshash'   
];

// TODO fix sql injection for column names in where clause, check against predetermined list
function constructWhereClause(args: any, variableStartNumber: number): Readonly<WhereClauseResult> {

    const suffixMap: {
        [key: string]: '=' | '>' | '>=' | '<' | '<=';
    } = {
        '': '=',
        'gt': '>',
        'gte': '>=',
        'lt': '<',
        'lte': '<='
    };    

    const whereClauseResult: Readonly<WhereClauseResult> = Object.entries(args.where).reduce((result, entry, index) => {    
        const fieldName: string = entry[0];
        const fieldValue: any = entry[1];

        const fieldNamePrefix: string = fieldName.split('_')[0];
        const fieldNameSuffix: string = fieldName.split('_')[1] || '';

        const operation: '=' | '>' | '>=' | '<' | '<=' = suffixMap[fieldNameSuffix];

        // TODO this protects us from SQL injection. Ensure that this is good enough
        if (supportedFieldNames.indexOf(fieldNamePrefix.toLowerCase()) === -1) {
            throw new Error('Not supported');
        }

        return {
            whereClause: `${result.whereClause} ${index !== 0 ? 'AND' : ''} ${fieldNamePrefix} ${operation} $${variableStartNumber + index}`,
            variables: [...result.variables, fieldValue.toISOString ? fieldValue.toISOString() : fieldValue]
        };
    }, {
        whereClause: ``,
        variables: []
    });

    return whereClauseResult;
}

function getStats(blocks: ReadonlyArray<Block>, selectionSetObject: any, totaler: () => BigNumber) {

    if (blocks.length === 0) {
        return {
            total: 0,
            average: {
                perBlock: 0,
                perSecond: 0,
                perMinute: 0,
                perHour: 0,
                perDay: 0,
                perWeek: 0,
                perMonth: 0,
                perYear: 0
            }
        };
    }

    const firstTimestamp = blocks[0].timestamp;
    const lastTimestamp = blocks[blocks.length - 1].timestamp;

    const deltaMilliseconds: BigNumber = new BigNumber(new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime());

    const total: BigNumber = totaler();

    return {
        ...(selectionSetObject.total ? {
            total
        }: {}),
        ...(selectionSetObject.average ? {
            average: {
                ...(selectionSetObject.average.perBlock ? {
                    perBlock: total.dividedBy(blocks.length).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perSecond ? {
                    perSecond: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000)).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perMinute ? {
                    perMinute: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60)).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perHour ? {
                    perHour: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60)).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perDay ? {
                    perDay: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24)).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perWeek ? {
                    perWeek: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24 * 7)).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perMonth ? {
                    perMonth: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24 * 30)).toFixed(2)
                }: {}),
                ...(selectionSetObject.average.perYear ? {
                    perYear: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24 * 365)).toFixed(2)
                }: {})    
            }
        }: {})
    };            
}

function getSelectionSetObjectFromInfo(info: Readonly<GraphQLResolveInfo>): Readonly<any> {
    
    if (
        info.operation.kind === 'OperationDefinition' && 
        info.operation.operation === 'query'
    ) {
        return getSelectionSetObjectFromOperationDefinitionNodeSelectionSet(info.operation.selectionSet);
    }

    return {};
}

function getSelectionSetObjectFromOperationDefinitionNodeSelectionSet(selectionSet: Readonly<SelectionSetNode>): Readonly<{}> {
    return selectionSet.selections.reduce((result, selection) => {
        if (selection.kind === 'Field') {
            return {
                ...result,
                [selection.name.value]: selection.selectionSet === undefined ? true : getSelectionSetObjectFromOperationDefinitionNodeSelectionSet(selection.selectionSet)
            };
        }

        return result;
    }, {});
}

// type SelectClauseResult = {
//     selectClause: string;
//     variables: ReadonlyArray<any>;
// };

// function constructSelectClause(info: Readonly<GraphQLResolveInfo>): Readonly<SelectClauseResult> {
//     const itemsSelectionSet = 
//         info.operation.selectionSet.selections[0].selectionSet.selections.find((selection) => {
//             return selection.name.value === 'items';
//         }).selectionSet.selections.map((selection) => {
//             return selection.name.value;
//         });

//     const variables = itemsSelectionSet.map((x) => {
//         return x;
//     });

//     const variableNames = itemsSelectionSet.map((x, index) => {
//         return `$${index + 1} as hello`;
//     });

//     return {
//         selectClause: variableNames.join(','),
//         variables: variables
//     };
// }

function getSelectClause(selectionSetObject) {
    return Object.entries(selectionSetObject).reduce((result, selectionSetObjectEntry) => {
        return [...result, selectionSetObjectEntry[0].toLowerCase(), ...getSelectClause(selectionSetObjectEntry[1])];
    }, []).filter((x) => {
        return supportedFieldNames.includes(x);
    });
}

function getBlocksForDays(blocks: ReadonlyArray<Block>, dateChecker: (date1: Date, date2: Date) => boolean): ReadonlyArray<BlocksForDay> {
    return blocks.reduce((result: {
        currentBlockForDay: {
            dateInDay: 'NOT_SET' | Date;
            blocks: Array<Block>;
        };
        blocksForDays: Array<BlocksForDay>;
    }, block, index) => {

        if (result.currentBlockForDay.dateInDay === 'NOT_SET') {
            return {
                ...result,
                currentBlockForDay: {
                    dateInDay: new Date(block.timestamp),
                    blocks: [block]
                }
            };
        }

        if (
            dateChecker(result.currentBlockForDay.dateInDay, new Date(block.timestamp))
            // result.currentBlockForDay.dateInDay.getUTCFullYear() === new Date(block.timestamp).getUTCFullYear() &&
            // result.currentBlockForDay.dateInDay.getUTCMonth() === new Date(block.timestamp).getUTCMonth() &&
            // result.currentBlockForDay.dateInDay.getUTCDate() === new Date(block.timestamp).getUTCDate()
        ) {

            if (index === blocks.length - 1) {
                result.currentBlockForDay.blocks.push(block);
                result.blocksForDays.push(result.currentBlockForDay);
                return result;

                // return {
                //     ...result,
                //     blocksForDays: [...result.blocksForDays, {
                //         ...result.currentBlockForDay,
                //         blocks: [...result.currentBlockForDay.blocks, block]
                //     }]
                // };

                // return {
                //     ...result,
                //     blocksForDays: [...result.blocksForDays, {
                //         ...result.currentBlockForDay,
                //         blocks: [...result.currentBlockForDay.blocks, block]
                //     }]
                // };
            }
            else {
                // return {
                //     ...result,
                //     currentBlockForDay: {
                //         ...result.currentBlockForDay,
                //         blocks: [...result.currentBlockForDay.blocks, block]
                //     }
                // };

                result.currentBlockForDay.blocks.push(block);
                return result;
            }
        }

        result.blocksForDays.push(result.currentBlockForDay);

        return {
            ...result,
            currentBlockForDay: {
                dateInDay: new Date(block.timestamp),
                blocks: [block]
            },
            blocksForDays: result.blocksForDays
        };

        // return {
        //     ...result,
        //     currentBlockForDay: {
        //         dateInDay: new Date(block.timestamp),
        //         blocks: [block]
        //     },
        //     blocksForDays: [...result.blocksForDays, result.currentBlockForDay]
        // };
    }, {
        currentBlockForDay: {
            dateInDay: 'NOT_SET',
            blocks: []
        },
        blocksForDays: []
    }).blocksForDays;
}

function datesInSameSecond(date1: Date, date2: Date): boolean {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate() &&
        date1.getUTCHours() === date2.getUTCHours() &&
        date1.getUTCSeconds() === date2.getUTCSeconds()
    );
}

function datesInSameMinute(date1: Date, date2: Date): boolean {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate() &&
        date1.getUTCHours() === date2.getUTCHours() &&
        date1.getUTCMinutes() === date2.getUTCMinutes()
    );
}

function datesInSameHour(date1: Date, date2: Date): boolean {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate() &&
        date1.getUTCHours() === date2.getUTCHours()
    );
}

function datesInSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
}

function datesInSameWeek(date1: Date, date2: Date): boolean {

    const date1NearestSundayInThePast: Date = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate() - date1.getUTCDay());
    const date1NearestSundayInTheFuture: Date = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate() + 7 - date1.getUTCDay());

    const date2NearestSundayInThePast: Date = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate() - date2.getUTCDay());
    const date2NearestSundayInTheFuture: Date = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate() + 7 - date2.getUTCDay());

    return (
        datesInSameDay(date1NearestSundayInThePast, date2NearestSundayInThePast) &&
        datesInSameDay(date1NearestSundayInTheFuture, date2NearestSundayInTheFuture)
    );
}

function datesInSameMonth(date1: Date, date2: Date): boolean {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth()
    );
}

function datesInSameYear(date1: Date, date2: Date): boolean {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear()
    );
}