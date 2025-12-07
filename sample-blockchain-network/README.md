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
