-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txHash" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "sender" VARCHAR(42) NOT NULL,
    "receiver" VARCHAR(42) NOT NULL,
    "origin" VARCHAR(42) NOT NULL,
    "amount" BIGINT NOT NULL,
    "value" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "gasPrice" BIGINT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "chainId" INTEGER NOT NULL,

    CONSTRAINT "RawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ruleId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "sender" VARCHAR(42),
    "receiver" VARCHAR(42),
    "origin" VARCHAR(42),
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "timestamp" INTEGER,
    "indicators" JSONB NOT NULL,
    "relatedEventIds" JSONB NOT NULL,
    "rawAiJson" JSONB,
    "eventId" TEXT,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinuteStat" (
    "id" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "actor" VARCHAR(42) NOT NULL,
    "txCount" INTEGER NOT NULL,
    "totalValue" BIGINT NOT NULL,
    "uniqueReceivers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinuteStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawEvent_txHash_key" ON "RawEvent"("txHash");

-- CreateIndex
CREATE INDEX "RawEvent_blockNumber_idx" ON "RawEvent"("blockNumber");

-- CreateIndex
CREATE INDEX "RawEvent_timestamp_idx" ON "RawEvent"("timestamp");

-- CreateIndex
CREATE INDEX "RawEvent_sender_idx" ON "RawEvent"("sender");

-- CreateIndex
CREATE INDEX "RawEvent_receiver_idx" ON "RawEvent"("receiver");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_category_idx" ON "Alert"("category");

-- CreateIndex
CREATE INDEX "Alert_txHash_idx" ON "Alert"("txHash");

-- CreateIndex
CREATE INDEX "MinuteStat_minute_idx" ON "MinuteStat"("minute");

-- CreateIndex
CREATE INDEX "MinuteStat_actor_idx" ON "MinuteStat"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "MinuteStat_minute_actor_key" ON "MinuteStat"("minute", "actor");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RawEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
