-- CreateTable
CREATE TABLE "seen_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionHash" TEXT NOT NULL,
    "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seen_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "seen_questions_userId_idx" ON "seen_questions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seen_questions_userId_questionHash_key" ON "seen_questions"("userId", "questionHash");
