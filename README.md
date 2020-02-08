# query-ethereum

# Production

## Geth node

We need to make this restart if it crashes or if the server restarts. We should also do a full sync eventually

```bash
docker run -d -it -p 8547:8547 -p 8545:8545 -p 30303:30303 -v ~/development/query-ethereum/geth-data:/root/.ethereum ethereum/client-go --graphql --graphql.addr 0.0.0.0 --rpc --rpcaddr 0.0.0.0 --nousb --graphql.vhosts=* --rpcvhosts=*
```

# Ethereum ETL Docker Container

First clone the repository:

```bash
git clone https://github.com/blockchain-etl/ethereum-etl.git
```

Then create the docker image:

```bash
cd ethereum-etl
docker build -t ethereum-etl:latest .
```

# Installing docker on EC2

```bash
sudo apt install docker.io
sudo groupadd docker
sudo usermod -aG docker ${USER}
```
If permissions are still messed up, you could try just changing the permissions on the docker file thing

```bash
sudo chmod 666 /var/run/docker.sock
```

Exit the terminal and re-enter

# Setting up Node.js server in production

You need to create a .env-production file in the root directory with the environment variables

You also need to install docker and create the ethereum-etl image

```bash
git clone
npm install
npm run startup-production
npx pm2 save
npx pm2 startup
```