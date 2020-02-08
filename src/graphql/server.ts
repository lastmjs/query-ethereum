import { ApolloServer } from 'apollo-server';
import * as fs from 'fs';
import { GraphQLScalarType } from 'graphql';
import { IResolvers } from 'graphql-tools';
import { Kind, 
    FieldNode
} from 'graphql/language';
import {
    blocks
} from './resolvers/blocks';
import BigNumber from 'bignumber.js';
import {
    startImport
} from '../services/import-ethereum-node-data-into-postgres';

const typeDefs = fs.readFileSync('./src/graphql/schema.graphql').toString();

const resolvers: Readonly<IResolvers> = {
    Query: {
        blocks
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
        totalDifficulty: (obj) => { return obj.totaldifficulty },
        unclesHash: (obj) => { return obj.uncleshash }
    },
    BigInt: new GraphQLScalarType({ // TODO make sure this type is exactly correct, since we are using BigNumber the values could be decimals, we might want to ensure that they aren't
        name: 'BigInt',
        description: '',
        serialize: (value) => {
            return new BigNumber(value).toString();
        },
        parseValue: (value) => {
            return new BigNumber(value);
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.INT) {
                return new BigNumber(ast.value);
            }

            throw new Error('Could not parse value');
        }
    }),
    BigDecimal: new GraphQLScalarType({
        name: 'BigDecimal',
        description: '',
        serialize: (value) => {
            return new BigNumber(value).toString();
        },
        parseValue: (value) => {
            return new BigNumber(value);
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.FLOAT) {
                return new BigNumber(ast.value);
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

const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true
});

server.listen({
    port: 3333
}).then(({ url }) => {
    console.log(`GraphQL server ready: ${url}`);
});

let importing = false;

setInterval(async () => {

    if (
        process.env.NODE_ENV === 'production' &&
        importing === false
    ) {
        importing = true;
        const startTime = new Date();
        await startImport();
        const endTime = new Date();

        console.log(`import took: ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`);

        importing = false;
    }

}, 30000);