export type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string,
  String: string,
  Boolean: boolean,
  Int: number,
  Float: number,
  BigInt: any,
  Date: any,
  BigDecimal: any,
  Hex32Bytes: any,
  Hex: any,
};

export type Average = {
   __typename?: 'Average',
  perBlock?: Maybe<Scalars['BigDecimal']>,
  perSecond?: Maybe<Scalars['BigDecimal']>,
  perMinute?: Maybe<Scalars['BigDecimal']>,
  perHour?: Maybe<Scalars['BigDecimal']>,
  perDay?: Maybe<Scalars['BigDecimal']>,
  perWeek?: Maybe<Scalars['BigDecimal']>,
  perMonth?: Maybe<Scalars['BigDecimal']>,
  perYear?: Maybe<Scalars['BigDecimal']>,
};



export type Block = {
   __typename?: 'Block',
  number: Scalars['Int'],
  hash: Scalars['Hex32Bytes'],
  nonce: Scalars['Hex'],
  transactionsRoot: Scalars['Hex32Bytes'],
  transactionCount: Scalars['Int'],
  stateRoot: Scalars['Hex32Bytes'],
  receiptsRoot: Scalars['Hex32Bytes'],
  extraData: Scalars['Hex'],
  gasLimit: Scalars['BigInt'],
  gasUsed: Scalars['BigInt'],
  timestamp: Scalars['Date'],
  logsBloom: Scalars['Hex'],
  /** mixHash: Hex32Bytes! # TODO This might be specific to a mining node, it isn't being returned from ethereum_etl */
  difficulty: Scalars['BigInt'],
  totalDifficulty: Scalars['BigInt'],
  /** uncleCount: Int! # TODO I do not know how to get this from the ethereum_etl data yet */
  unclesHash: Scalars['Hex32Bytes'],
};

export type BlocksResult = {
   __typename?: 'BlocksResult',
  stats?: Maybe<BlockStats>,
  items?: Maybe<Array<Block>>,
};

export type BlockStats = {
   __typename?: 'BlockStats',
  total?: Maybe<Scalars['BigInt']>,
  average?: Maybe<Average>,
  transactionCount?: Maybe<TransactionCountStats>,
  gasLimit?: Maybe<GasLimitStats>,
  gasUsed?: Maybe<GasUsedStats>,
  difficulty?: Maybe<DifficultyStats>,
};

export type BlocksWhereInput = {
  number?: Maybe<Scalars['Int']>,
  number_gt?: Maybe<Scalars['Int']>,
  number_gte?: Maybe<Scalars['Int']>,
  number_lt?: Maybe<Scalars['Int']>,
  number_lte?: Maybe<Scalars['Int']>,
  transactionCount?: Maybe<Scalars['Int']>,
  transactionCount_gt?: Maybe<Scalars['Int']>,
  transactionCount_gte?: Maybe<Scalars['Int']>,
  transactionCount_lt?: Maybe<Scalars['Int']>,
  transactionCount_lte?: Maybe<Scalars['Int']>,
  gasLimit?: Maybe<Scalars['BigInt']>,
  gasLimit_gt?: Maybe<Scalars['BigInt']>,
  gasLimit_gte?: Maybe<Scalars['BigInt']>,
  gasLimit_lt?: Maybe<Scalars['BigInt']>,
  gasLimit_lte?: Maybe<Scalars['BigInt']>,
  gasUsed?: Maybe<Scalars['BigInt']>,
  gasUsed_gt?: Maybe<Scalars['BigInt']>,
  gasUsed_gte?: Maybe<Scalars['BigInt']>,
  gasUsed_lt?: Maybe<Scalars['BigInt']>,
  gasUsed_lte?: Maybe<Scalars['BigInt']>,
  timestamp?: Maybe<Scalars['Date']>,
  timestamp_gt?: Maybe<Scalars['Date']>,
  timestamp_gte?: Maybe<Scalars['Date']>,
  timestamp_lt?: Maybe<Scalars['Date']>,
  timestamp_lte?: Maybe<Scalars['Date']>,
  difficulty?: Maybe<Scalars['BigInt']>,
  difficulty_gt?: Maybe<Scalars['BigInt']>,
  difficulty_gte?: Maybe<Scalars['BigInt']>,
  difficulty_lt?: Maybe<Scalars['BigInt']>,
  difficulty_lte?: Maybe<Scalars['BigInt']>,
  totalDifficulty?: Maybe<Scalars['BigInt']>,
  totalDifficulty_gt?: Maybe<Scalars['BigInt']>,
  totalDifficulty_gte?: Maybe<Scalars['BigInt']>,
  totalDifficulty_lt?: Maybe<Scalars['BigInt']>,
  totalDifficulty_lte?: Maybe<Scalars['BigInt']>,
};


export type DifficultyStats = {
   __typename?: 'DifficultyStats',
  total?: Maybe<Scalars['BigInt']>,
  average?: Maybe<Average>,
};

export type GasLimitStats = {
   __typename?: 'GasLimitStats',
  total?: Maybe<Scalars['BigInt']>,
  average?: Maybe<Average>,
};

export type GasUsedStats = {
   __typename?: 'GasUsedStats',
  total?: Maybe<Scalars['BigInt']>,
  average?: Maybe<Average>,
};



export type Query = {
   __typename?: 'Query',
  blocks: BlocksResult,
};


export type QueryBlocksArgs = {
  where?: Maybe<BlocksWhereInput>,
  last?: Maybe<Scalars['Int']>,
  first?: Maybe<Scalars['Int']>
};

export type TransactionCountStats = {
   __typename?: 'TransactionCountStats',
  total?: Maybe<Scalars['BigInt']>,
  average?: Maybe<Average>,
};
