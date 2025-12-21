const hre = require("hardhat");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
});
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const address = process.env.EVENT_EMITTER_ADDRESS;
  if (!address) {
    throw new Error("EVENT_EMITTER_ADDRESS not set");
  }

  const emitter = await hre.ethers.getContractAt(
    "EventEmitter",
    address
  );

  const signers = await hre.ethers.getSigners();
  const [a0, a1, a2, a3, a4, a5] = signers;

  // Normal traffic
  for (let i = 0; i < 20; i++) {
    const from = pick(signers);
    const to = pick(signers.filter(s => s.address !== from.address));
    await emitter
      .connect(from)
      .sendTransaction(to.address, 1, "hello", {
        value: hre.ethers.parseEther("0.01"),
      });
  }

  // Spam burst
  for (let i = 0; i < 80; i++) {
    await emitter
      .connect(a0)
      .sendTransaction(a1.address, 1, "spam", {
        value: hre.ethers.parseEther("0.001"),
      });
  }

  // Receiver spray
  for (let i = 0; i < 30; i++) {
    const to = pick([a1, a2, a3, a4, a5]);
    await emitter
      .connect(a2)
      .sendTransaction(to.address, 1, "spray", {
        value: hre.ethers.parseEther("0.0005"),
      });
  }

  // Value spike
  await emitter
    .connect(a3)
    .sendTransaction(a4.address, 1, "big_transfer", {
      value: hre.ethers.parseEther("100"),
    });

  console.log("Simulation complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
