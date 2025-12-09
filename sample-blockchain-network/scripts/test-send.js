const { ethers } = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT;

    if (!contractAddress) {
        console.error("Please pass CONTRACT=<address>");
        return;
    }

    const EventEmitter = await ethers.getContractFactory("EventEmitter");
    const contract = EventEmitter.attach(contractAddress);

    const [sender, receiver] = await ethers.getSigners();

    // Amount of ETH to send (in ethers)
    const ethToSend = "0.001"; 

    // Amount for the event (arbitrary)
    const eventAmount = Math.floor(Math.random() * 1000);

    // Send transaction with ETH and emit event
    const tx = await contract.sendTransaction(
        receiver.address,
        eventAmount,
        "Security test event",
        {
            value: ethers.parseEther(ethToSend) // this sends ETH along with the call
        }
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Event emitted!");
    console.log("ETH sent:", ethToSend, "ETH");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block number:", receipt.blockNumber);
}

main().catch(console.error);
