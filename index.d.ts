export type Block = {
    readonly number: HexString;
    readonly transactions: ReadonlyArray<Transaction>;
    readonly timestamp: HexString;
};
export type Transaction = {
    gasPrice: WEI;
    gasUsed: Gas;
    value: WEI;
};

export type GQLResult = {
    data?: any;
    errors?: any;
};

export type ETH = bigint; // TODO I believe in practice this will need to be a big decimal of some sort
export type WEI = bigint;
export type Gas = bigint;

type HexString = string;
type USD = number;

export type FeesToPriceInfoForDay = {
    readonly dateInDay: Date;
    readonly priceInUSD: USD;
    readonly feesInETH: ETH;
};