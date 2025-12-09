import "dotenv/config";
import { ethers } from "ethers";
import { redis } from "./config/redis.js";
import type { SecurityEvent } from "./types.js";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);

const abi = [
  "event SecurityEvent(address indexed sender,address indexed receiver,uint256 amount,string message,uint256 timestamp,uint256 blockNumber,uint256 gasPrice,uint256 nonce,address origin,uint256 chainId,uint256 value)"
];

const contract = new ethers.Contract(process.env.CONTRACT!, abi, provider);

console.log("Listening for SecurityEvent...");

contract.on("SecurityEvent", async (...args) => {
  const e = args.at(-1);

  const ev: SecurityEvent = {
    sender: args[0],
    receiver: args[1],
    amount: args[2].toString(),
    message: args[3],
    timestamp: Number(args[4]),
    blockNumber: Number(args[5]),
    gasPrice: args[6].toString(),
    nonce: args[7].toString(),
    origin: args[8],
    chainId: Number(args[9]),
    value: args[10].toString(),
    txHash: e.log.transactionHash,
    contract: e.log.address
  };

  await redis.lpush(process.env.REDIS_EVENTS_QUEUE_KEY!, JSON.stringify(ev));
  console.log("Queued:", ev.txHash);
});

await new Promise(() => {});
