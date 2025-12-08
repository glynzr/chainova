const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const contractAddress = process.env.CONTRACT;

    if (!contractAddress) {
        console.error("Please pass CONTRACT=<address>");
        return;
    }

    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    const logFilePath = path.join(logDir, "events.log");

    const EventEmitter = await ethers.getContractFactory("EventEmitter");
    const contract = EventEmitter.attach(contractAddress);

    console.log("\nListening for SecurityEvent events...\n");

    contract.on("SecurityEvent", async (...args) => {
        const event = args[args.length - 1]; // the last argument is the event object
        try {
            // Fetch provider from contract
            const provider = event.emitter.runner.provider;

            // Get transaction receipt
            const txReceipt = await provider.getTransactionReceipt(event.log.transactionHash);

            // Get block info
            const block = await provider.getBlock(event.log.blockNumber);
            
            const tx = await provider.getTransaction(event.log.transactionHash);
            const value = tx ? ethers.formatEther(tx.value || 0) : "0";

            const gasUsed = txReceipt ? txReceipt.gasUsed.toString() : "0";
            const status = txReceipt ? txReceipt.status : "unknown";
            const baseFee = block ? (block.baseFeePerGas ? block.baseFeePerGas.toString() : "0") : "0";
            const miner = block ? block.miner : "unknown";

            const logEntry = `
============================
 SECURITY EVENT DETECTED
============================
Event Name: SecurityEvent
Block:       ${event.log.blockNumber}
Tx Hash:     ${event.log.transactionHash}
Contract:    ${event.log.address}

Sender:      ${event.args.sender}
Receiver:    ${event.args.receiver}
Amount:      ${event.args.amount}
Message:     ${event.args.message}
Timestamp:   ${event.args.timestamp}
Gas Price:   ${event.args.gasPrice}
Nonce:       ${event.args.nonce}
Chain ID:    ${event.args.chainId}

Value (ETH): ${value}
Gas Used:    ${gasUsed}
Base Fee:    ${baseFee}
Miner:       ${miner}
Status:      ${status}
Origin (tx.origin): ${event.args.origin}

============================
`;

            console.log(logEntry);
            fs.appendFileSync(logFilePath, logEntry);
        } catch (err) {
            console.error(" Error fetching tx/block info:", err);
        }
    });

    await new Promise(() => {}); 
}

main().catch(console.error);
