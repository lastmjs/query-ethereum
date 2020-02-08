import {
    BlocksResult,
    Block
} from '../types';
import { GraphQLResolveInfo } from 'graphql';
import { postgres } from '../../postgres/postgres';
import BigNumber from 'bignumber.js';

export async function blocks(
    obj: any, 
    args: any, 
    context: any, 
    info: Readonly<GraphQLResolveInfo>
): Promise<Readonly<BlocksResult>> {
    const first: number | undefined = args.first;
    const last: number | undefined = args.last;
    const wherePresent: boolean = args.where !== undefined && args.where !== null;

    const whereClauseResult: Readonly<WhereClauseResult> | 'NO_WHERE_PRESENT' = wherePresent ? constructWhereClause(args, 1) : 'NO_WHERE_PRESENT';

    await postgres.query('BEGIN');

    // TODO we will want to optimize eventually and only select what is necessary...but this will require sql injection sanitization and 
    // TODO selecting extra fields for the stats selection sets
    const sqlQuery1: string = `DECLARE liahona SCROLL CURSOR FOR SELECT * FROM block ${whereClauseResult === 'NO_WHERE_PRESENT' ? '' : `WHERE ${whereClauseResult.whereClause}`} ORDER BY timestamp DESC;`;

    console.log(sqlQuery1);

    await postgres.query({
        text: sqlQuery1,
        values: [...(whereClauseResult === 'NO_WHERE_PRESENT' ? [] : whereClauseResult.variables)]
    });

    const sqlQuery2: string = `${getFetchStatement(first, last)};`;

    console.log(sqlQuery2)

    const sqlQueryResponse2 = await postgres.query({
        text: sqlQuery2,
        values: []
    });

    console.log(sqlQueryResponse2)

    const sqlQueryResponse = sqlQueryResponse2.length === 3 ? sqlQueryResponse2[2] : sqlQueryResponse2;
    console.log(sqlQueryResponse);

    await postgres.query('COMMIT');

    // TODO do not calculate all of the stats all of the time, only when selected
    return {
        stats: {
            total: getStats(sqlQueryResponse.rows, () => new BigNumber(sqlQueryResponse.rows.length)).total,
            average: getStats(sqlQueryResponse.rows, () => new BigNumber(sqlQueryResponse.rows.length)).average,
            transactionCount: getStats(sqlQueryResponse.rows, () => {
                return sqlQueryResponse.rows.reduce((result, row) => {
                    return result.plus(row.transactioncount);
                }, new BigNumber(0));            
            }),
            gasLimit: getStats(sqlQueryResponse.rows, () => {
                return sqlQueryResponse.rows.reduce((result, row) => {
                    return result.plus(row.gaslimit);
                }, new BigNumber(0));            
            }),
            gasUsed: getStats(sqlQueryResponse.rows, () => {
                return sqlQueryResponse.rows.reduce((result, row) => {
                    return result.plus(row.gasused);
                }, new BigNumber(0));            
            }),
            difficulty: getStats(sqlQueryResponse.rows, () => {
                return sqlQueryResponse.rows.reduce((result, row) => {
                    return result.plus(row.difficulty);
                }, new BigNumber(0));            
            }),
            ommerCount: getStats(sqlQueryResponse.rows, () => {
                return sqlQueryResponse.rows.reduce((result, row) => {
                    return result.plus(row.ommercount);
                }, new BigNumber(0));            
            })
        },
        items: sqlQueryResponse.rows
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

    const supportedFieldNames = [
        'number',
        'hash',
        'nonce',
        'transactionsRoot',
        'transactionCount',
        'stateRoot',
        'receiptsRoot',
        'extraData',
        'gasLimit',
        'gasUsed',
        'timestamp',
        'logsBloom',
        'mixHash',
        'difficulty',
        'totalDifficulty',
        'ommerCount',
        'ommerHash'    
    ];

    const whereClauseResult: Readonly<WhereClauseResult> = Object.entries(args.where).reduce((result, entry, index) => {    
        const fieldName: string = entry[0];
        const fieldValue: any = entry[1];

        const fieldNamePrefix: string = fieldName.split('_')[0];
        const fieldNameSuffix: string = fieldName.split('_')[1] || '';

        const operation: '=' | '>' | '>=' | '<' | '<=' = suffixMap[fieldNameSuffix];

        // TODO this protects us from SQL injection. Ensure that this is good enough
        if (supportedFieldNames.indexOf(fieldNamePrefix) === -1) {
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

function getStats(blocks: ReadonlyArray<Block>, totaler: () => BigNumber) {

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
        total,
        average: {
            perBlock: total.dividedBy(blocks.length),
            perSecond: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000)).toFixed(2),
            perMinute: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60)).toFixed(2),
            perHour: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60)).toFixed(2),
            perDay: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24)).toFixed(2),
            perWeek: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24 * 7)).toFixed(2),
            perMonth: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24 * 30)).toFixed(2),
            perYear: deltaMilliseconds.eq(0) ? 0 : total.dividedBy(deltaMilliseconds.dividedBy(1000 * 60 * 60 * 24 * 365)).toFixed(2)    
        }
    };            
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