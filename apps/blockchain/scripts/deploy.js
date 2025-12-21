const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const EventEmitter = await hre.ethers.getContractFactory("EventEmitter");
  const contract = await EventEmitter.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("EventEmitter deployed to:", address);

  // Copy ABI to collector
  const artifact = await hre.artifacts.readArtifact("EventEmitter");
  const abiOut = path.resolve(
    __dirname,
    "../../collector/src/abi/EventEmitter.json"
  );

  fs.mkdirSync(path.dirname(abiOut), { recursive: true });
  fs.writeFileSync(abiOut, JSON.stringify(artifact.abi, null, 2));

  // Update root .env if exists
  const envPath = path.resolve(__dirname, "../../../.env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf-8");
    env = env.replace(
      /EVENT_EMITTER_ADDRESS=.*/g,
      `EVENT_EMITTER_ADDRESS="${address}"`
    );
    fs.writeFileSync(envPath, env);
    console.log("Updated EVENT_EMITTER_ADDRESS in .env");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
