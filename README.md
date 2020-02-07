# query-ethereum

# Production

## Geth node

We need to make this restart if it crashes or if the server restarts. We should also do a full sync eventually

```bash
docker run -d -it -p 8547:8547 -p 8545:8545 -p 30303:30303 -v ~/development/query-ethereum/geth-data:/root/.ethereum ethereum/client-go --graphql --graphql.addr 0.0.0.0 --rpc --rpcaddr 0.0.0.0 --nousb --graphql.vhosts=* --rpcvhosts=*
```