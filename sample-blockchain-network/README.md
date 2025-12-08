# sample-blockchain-network
NOTE: this part will be enhanced! Stay tuned,kitties!

I used hardhat for simulating blockchain network with single-node.I created 10 accounts and each of them represents node in my case(do not want to use all hardware resources in this part)

```
bun init -y
bun install --save-dev hardhat
bun hardhat

bun hardhat node --port 8545

```

I deployed a smart contract emitting events on contracts/EventEmitter.sol


Update:
Event logs are stored in log file.

Open 3 terminal at the same time:
On the 1st terminal:
```
bun hardhat node --port 8545
```

2nd terminal(deploy contract and start listener)
```
bun hardhat run scripts/deploy.js --network localhost

CONTRACT=<enter contract address> npx hardhat run scripts/watch-events.js --network localhost

```

On 3rd terminal, run test script:
```
CONTRACT=<enter contract address> npx hardhat run scripts/test-send.js --network localhost
```