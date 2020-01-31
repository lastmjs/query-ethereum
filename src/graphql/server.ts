import { ApolloServer } from 'apollo-server';
import * as fs from 'fs';
import { GraphQLScalarType } from 'graphql';
import { IResolvers } from 'graphql-tools';
import { Kind, FieldNode } from 'graphql/language';
import { postgres } from '../postgres/postgres';

const typeDefs = fs.readFileSync('./src/graphql/schema.graphql').toString();

const resolvers: Readonly<IResolvers> = {
    Query: {
        blocks: async (obj, args, context, info) => {

            // console.log(info);

            if (
                args.where === undefined ||
                args.where === null
            ) {
                // const itemsSelectionSet = info.operation.selectionSet.selections.find((selection) => {
                //     return selection.kind === 'Field' ? selection.name.value === 'items' ? true : false : false;
                // });

                // // (itemsSelectionSet as FieldNode).
                // const temp = itemsSelectionSet?.

                // console.log(JSON.stringify(info.operation.selectionSet.selections, null, 2));

                // const blocksSelectionSet = info.operation.selectionSet.selections[0].kind === 'Field' ? info.operation.selectionSet.selections[0].selectionSet : throw new Error('Not supported');

                // TODO type this and stuff
                // TODO also we are now vulnerable to sql injection, so fix that if possible...just generate dollar sign variables for the pg way of doing it
                const itemsSelectionSet = 
                    info.operation.selectionSet.selections[0].selectionSet.selections.find((selection) => {
                        return selection.name.value === 'items';
                    }).selectionSet.selections.map((selection) => {
                        return selection.name.value;
                    });

                const sqlQuery = `select ${itemsSelectionSet.join(',')} from block ORDER BY timestamp DESC;`;
                console.log('sqlQuery', sqlQuery);

                const response = await postgres.query(sqlQuery);
    
                console.log(response);

                return {
                    stats: {
                        total: response.rows.length
                    },
                    items: response.rows
                };
            }
            else {
                const whereQuery = Object.entries(args.where).reduce((result, entry, index) => {
                    const partialQuery = buildBlocksWhereInputQuery(entry[0], entry[1]);

                    return `${result} ${index !== 0 ? 'AND' : ''} ${partialQuery}`;
                }, '');

                const itemsSelectionSet = 
                    info.operation.selectionSet.selections[0].selectionSet.selections.find((selection) => {
                        return selection.name.value === 'items';
                    }).selectionSet.selections.map((selection) => {
                        return selection.name.value;
                    });

                const sqlQuery = `SELECT ${itemsSelectionSet.join(',')} FROM block WHERE ${whereQuery} ORDER BY timestamp DESC;`;
                console.log('sqlQuery', sqlQuery);

                const response = await postgres.query(sqlQuery);
    
                // console.log(response);

                return {
                    stats: {
                        total: response.rows.length,
                        average: getAverage(response.rows, info),
                        transactionCount: getTransactionCountStats(response.rows),
                        gasLimit: getGasLimitStats(response.rows),
                        gasUsed: getGasUsedStats(response.rows),
                        difficulty: getDifficultyStats(response.rows),
                        ommerCount: getOmmerCountStats(response.rows)
                    },
                    items: response.rows
                };
            }
        },
    },
    Block: {
        transactionsRoot: (obj) => { return obj.transactionsroot },
        transactionCount: (obj) => { return obj.transactioncount },
        stateRoot: (obj) => { return obj.stateroot },
        receiptsRoot: (obj) => { return obj.receiptsroot },
        extraData: (obj) => { return obj.extradata },
        gasLimit: (obj) => { return obj.gaslimit },
        gasUsed: (obj) => { return obj.gasused },
        logsBloom: (obj) => { return obj.logsbloom },
        mixHash: (obj) => { return obj.mixhash },
        totalDifficulty: (obj) => { return obj.totaldifficulty },
        ommerCount: (obj) => { return obj.ommercount },
        ommerHash: (obj) => { return obj.ommerhash }
    },
    BigInt: new GraphQLScalarType({
        name: 'BigInt',
        description: '',
        serialize: (value) => {
            return value;
        },
        parseValue: (value) => {
            return value;
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.INT) {
                return ast.value;
            }

            throw new Error('Could not parse value');
        }
    }),
    Hex32Bytes: new GraphQLScalarType({
        name: 'Hex32Bytes',
        description: '',
        serialize: (value) => {
            return value;
        },
        parseValue: (value) => {
            return value;
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.STRING) {
                return ast.value;
            }

            throw new Error('Could not parse value');
        }
    }),
    Hex: new GraphQLScalarType({
        name: 'Hex',
        description: '',
        serialize: (value) => {
            return value;
        },
        parseValue: (value) => {
            return value;
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.STRING) {
                return ast.value;
            }

            throw new Error('Could not parse value');
        }
    }),
    Date: new GraphQLScalarType({
        name: 'Date',
        description: '',
        serialize: (value) => {
            return value.toISOString();
        },
        parseValue: (value) => {
            return new Date(value);
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.STRING) {
                return new Date(ast.value);
            }

            throw new Error('Could not parse value');
        }
    }),
};

function getTransactionCountStats(rows) {

    const firstTimestamp = rows[0].timestamp;
    const lastTimestamp = rows[rows.length - 1].timestamp;

    console.log('firstTimestamp', firstTimestamp);
    console.log('lastTimestamp', lastTimestamp);

    const deltaMilliseconds = new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime();

    console.log('deltaMilliseconds', deltaMilliseconds);

    const totalTransactionCount = getTotalTransactionCount(rows);

    console.log('totalTransactionCount', totalTransactionCount);

    return {
        total: totalTransactionCount,
        average: {
            perBlock: totalTransactionCount / rows.length,
            perSecond: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / 1000)).toFixed(2),
            perMinute: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / (1000 * 60))).toFixed(2),
            perHour: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / (1000 * 60 * 60))).toFixed(2),
            perDay: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / (1000 * 60 * 60 * 24))).toFixed(2),
            perWeek: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 7))).toFixed(2),
            perMonth: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 30))).toFixed(2),
            perYear: deltaMilliseconds === 0 ? 0 : (totalTransactionCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 365))).toFixed(2)    
        }
    };
}

function getGasLimitStats(rows) {
    const firstTimestamp = rows[0].timestamp;
    const lastTimestamp = rows[rows.length - 1].timestamp;

    console.log('firstTimestamp', firstTimestamp);
    console.log('lastTimestamp', lastTimestamp);

    const deltaMilliseconds = new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime();

    console.log('deltaMilliseconds', deltaMilliseconds);

    const totalGasLimitCount = rows.reduce((result, row) => {
        return result + row.gaslimit;
    }, 0);

    return {
        total: totalGasLimitCount,
        average: {
            perBlock: totalGasLimitCount / rows.length,
            perSecond: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / 1000)).toFixed(2),
            perMinute: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / (1000 * 60))).toFixed(2),
            perHour: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / (1000 * 60 * 60))).toFixed(2),
            perDay: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / (1000 * 60 * 60 * 24))).toFixed(2),
            perWeek: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 7))).toFixed(2),
            perMonth: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 30))).toFixed(2),
            perYear: deltaMilliseconds === 0 ? 0 : (totalGasLimitCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 365))).toFixed(2)    
        }
    };
}

function getGasUsedStats(rows) {
    const firstTimestamp = rows[0].timestamp;
    const lastTimestamp = rows[rows.length - 1].timestamp;

    console.log('firstTimestamp', firstTimestamp);
    console.log('lastTimestamp', lastTimestamp);

    const deltaMilliseconds = new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime();

    console.log('deltaMilliseconds', deltaMilliseconds);

    const totalGasUsedCount = rows.reduce((result, row) => {
        return result + row.gasused;
    }, 0);

    return {
        total: totalGasUsedCount,
        average: {
            perBlock: totalGasUsedCount / rows.length,
            perSecond: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / 1000)).toFixed(2),
            perMinute: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / (1000 * 60))).toFixed(2),
            perHour: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / (1000 * 60 * 60))).toFixed(2),
            perDay: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / (1000 * 60 * 60 * 24))).toFixed(2),
            perWeek: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 7))).toFixed(2),
            perMonth: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 30))).toFixed(2),
            perYear: deltaMilliseconds === 0 ? 0 : (totalGasUsedCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 365))).toFixed(2)    
        }
    };    
}

function getDifficultyStats(rows) {
    const firstTimestamp = rows[0].timestamp;
    const lastTimestamp = rows[rows.length - 1].timestamp;

    console.log('firstTimestamp', firstTimestamp);
    console.log('lastTimestamp', lastTimestamp);

    const deltaMilliseconds = new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime();

    console.log('deltaMilliseconds', deltaMilliseconds);

    const totalDifficulty = rows.reduce((result, row) => {
        return result + row.difficulty;
    }, 0);

    return {
        total: totalDifficulty,
        average: {
            perBlock: totalDifficulty / rows.length,
            perSecond: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / 1000)).toFixed(2),
            perMinute: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / (1000 * 60))).toFixed(2),
            perHour: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / (1000 * 60 * 60))).toFixed(2),
            perDay: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / (1000 * 60 * 60 * 24))).toFixed(2),
            perWeek: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 7))).toFixed(2),
            perMonth: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 30))).toFixed(2),
            perYear: deltaMilliseconds === 0 ? 0 : (totalDifficulty / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 365))).toFixed(2)    
        }
    };        
}

function getOmmerCountStats(rows) {
    const firstTimestamp = rows[0].timestamp;
    const lastTimestamp = rows[rows.length - 1].timestamp;

    console.log('firstTimestamp', firstTimestamp);
    console.log('lastTimestamp', lastTimestamp);

    const deltaMilliseconds = new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime();

    console.log('deltaMilliseconds', deltaMilliseconds);

    const totalOmmerCount = rows.reduce((result, row) => {
        return result + row.ommercount;
    }, 0);

    return {
        total: totalOmmerCount,
        average: {
            perBlock: totalOmmerCount / rows.length,
            perSecond: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / 1000)).toFixed(2),
            perMinute: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / (1000 * 60))).toFixed(2),
            perHour: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / (1000 * 60 * 60))).toFixed(2),
            perDay: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / (1000 * 60 * 60 * 24))).toFixed(2),
            perWeek: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 7))).toFixed(2),
            perMonth: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 30))).toFixed(2),
            perYear: deltaMilliseconds === 0 ? 0 : (totalOmmerCount / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 365))).toFixed(2)    
        }
    };            
}

function getTotalTransactionCount(rows) {
    return rows.reduce((result, row) => {
        return result + row.transactioncount;
    }, 0);
}

function getAverage(rows) {

    const firstTimestamp = rows[0].timestamp;
    const lastTimestamp = rows[rows.length - 1].timestamp;

    console.log('firstTimestamp', firstTimestamp);
    console.log('lastTimestamp', lastTimestamp);

    const deltaMilliseconds = new Date(firstTimestamp).getTime() - new Date(lastTimestamp).getTime();

    console.log('deltaMilliseconds', deltaMilliseconds);

    if (deltaMilliseconds === 0) {
        return 0;
    }

    return {
        perBlock: rows.length / rows.length,
        perSecond: (rows.length / (deltaMilliseconds / 1000)).toFixed(2),
        perMinute: (rows.length / (deltaMilliseconds / (1000 * 60))).toFixed(2),
        perHour: (rows.length / (deltaMilliseconds / (1000 * 60 * 60))).toFixed(2),
        perDay: (rows.length / (deltaMilliseconds / (1000 * 60 * 60 * 24))).toFixed(2),
        perWeek: (rows.length / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 7))).toFixed(2),
        perMonth: (rows.length / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 30))).toFixed(2),
        perYear: (rows.length / (deltaMilliseconds / (1000 * 60 * 60 * 24 * 365))).toFixed(2)
    };
}

const suffixMap = {
    '': '=',
    'gt': '>',
    'gte': '>=',
    'lt': '<',
    'lte': '<='
};

// TODO SQL injection
function buildBlocksWhereInputQuery(fieldName: string, fieldValue: any) {
 
    const prefix = fieldName.split('_')[0];
    const suffix = fieldName.split('_')[1] || '';

    const operation = suffixMap[suffix];

    return `${prefix} ${operation} ${fieldValue.toISOString ? `'${fieldValue.toISOString()}'` : fieldValue}`;
}

const server = new ApolloServer({
    typeDefs,
    resolvers
});

server.listen({
    port: 3333
}).then(({ url }) => {
    console.log(`GraphQL server ready: ${url}`);
});