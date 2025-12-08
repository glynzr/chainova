const { ethers } = require("hardhat");

async function main() {
    const EventEmitter = await ethers.getContractFactory("EventEmitter");
    const contract = await EventEmitter.deploy();

    await contract.waitForDeployment();

    console.log("Contract deployed to:", await contract.getAddress());
}

main().catch(console.error);
