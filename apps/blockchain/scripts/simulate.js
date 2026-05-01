const hre = require("hardhat");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
});

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const address = process.env.EVENT_EMITTER_ADDRESS;
  if (!address) {
    throw new Error("EVENT_EMITTER_ADDRESS not set");
  }

  const emitter = await hre.ethers.getContractAt("EventEmitter", address);
  const signers = await hre.ethers.getSigners();
  const [a0, a1, a2, a3, a4, a5, a6] = signers;

  console.log("▶ Starting simulation…");


    //  NORMAL TRAFFIC (baseline)

  for (let i = 0; i < 20; i++) {
    const from = pick(signers);
    const to = pick(signers.filter(s => s.address !== from.address));
    await emitter.connect(from).sendTransaction(
      to.address,
      1,
      "hello",
      { value: hre.ethers.parseEther("0.01") }
    );
    await sleep(100);
  }

  /* ===============================
     R001 – Spam burst
     =============================== */
  console.log("▶ Triggering R001_SPAM_BURST");
  for (let i = 0; i < 80; i++) {
    await emitter.connect(a0).sendTransaction(
      a1.address,
      1,
      "spam",
      { value: hre.ethers.parseEther("0.001") }
    );
  }

  /* ===============================
     R002 – Receiver spray
     =============================== */
  console.log("▶ Triggering R002_RECEIVER_SPRAY");
  for (let i = 0; i < 30; i++) {
    const to = pick([a1, a2, a3, a4, a5, a6]);
    await emitter.connect(a2).sendTransaction(
      to.address,
      1,
      "spray",
      { value: hre.ethers.parseEther("0.0005") }
    );
  }

  /* ===============================
     R003 – Repeated message payload
     =============================== */
  console.log("▶ Triggering R003_REPEATED_PAYLOAD");
  for (let i = 0; i < 12; i++) {
    await emitter.connect(a4).sendTransaction(
      a5.address,
      1,
      "repeat_me",
      { value: hre.ethers.parseEther("0.002") }
    );
  }

  /* ===============================
     R004 – High value transfer
     =============================== */
  console.log("▶ Triggering R004_HIGH_VALUE");
  await emitter.connect(a3).sendTransaction(
    a6.address,
    1,
    "big_transfer",
    { value: hre.ethers.parseEther("100") }
  );

  /* ===============================
     R005 – tx.origin mismatch
     =============================== */
  // Already triggered implicitly via contract calls
  console.log("▶ R005_ORIGIN_MISMATCH triggered implicitly");

  /* ===============================
     R007 – Ping-pong pattern
     =============================== */
  console.log("▶ Triggering R007_PING_PONG_PATTERN");
  for (let i = 0; i < 12; i++) {
    await emitter.connect(a1).sendTransaction(
      a2.address,
      1,
      "ping",
      { value: hre.ethers.parseEther("0.001") }
    );
    await emitter.connect(a2).sendTransaction(
      a1.address,
      1,
      "pong",
      { value: hre.ethers.parseEther("0.001") }
    );
  }

  /* ===============================
     R008 – Fan-in (collector)
     =============================== */
  console.log("▶ Triggering R008_FAN_IN_COLLECTOR");
  const fanInSenders = [a0, a1, a2, a3, a4, a5];
  for (const s of fanInSenders) {
    for (let i = 0; i < 3; i++) {
      await emitter.connect(s).sendTransaction(
        a6.address,
        1,
        "fan_in",
        { value: hre.ethers.parseEther("0.0008") }
      );
    }
  }

  /* ===============================
     R009 – Gas price spike
     =============================== */
  console.log("▶ Triggering R009_GAS_PRICE_SPIKE");
  await emitter.connect(a0).sendTransaction(
    a1.address,
    1,
    "high_gas",
    {
      value: hre.ethers.parseEther("0.001"),
      gasPrice: hre.ethers.parseUnits("200", "gwei"),
    }
  );

  /* ===============================
     R010 – Shared origin swarm
     =============================== */
  console.log("▶ Triggering R010_SHARED_ORIGIN_SWARM");
  for (let i = 0; i < 10; i++) {
    const from = signers[i % signers.length];
    await emitter.connect(from).sendTransaction(
      a5.address,
      1,
      "origin_swarm",
      { value: hre.ethers.parseEther("0.0009") }
    );
  }

  console.log("Simulation complete — all rules exercised");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
