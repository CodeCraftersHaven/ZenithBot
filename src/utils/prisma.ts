import { handlePrismaError, logger } from "#utils";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";

const connectionString = `${process.env.DATABASE_URL}`;
// eslint-disable-next-line
const adapter = new PrismaPg({ connectionString });

class Prisma extends PrismaClient {
  constructor() {
    super({
      // adapter -- save for prisma update -- not yet available.
    });
  }

  override async $disconnect() {
    await super
      .$disconnect()
      .then(() => logger.warn("Disconnected from Prisma ORM!"))
      .catch((e) => logger.error(e));
  }

  override async $connect() {
    const args = process.argv.slice(2);
    const shouldGenerate = args.includes("--dbgen"); // node . --dbgen
    const shouldPush = args.includes("--dbpush"); // node . --dbpush

    if (shouldGenerate) {
      exec("npx prisma generate", (err, stdout) => {
        if (err) return logger.error(err);
        logger.info(stdout);
      });
    }

    await super
      .$connect()
      .then(() => logger.info("Connected to Prisma ORM"))
      .catch(handlePrismaError);

    if (shouldPush) {
      exec("npx prisma db push", (err, stdout) => {
        if (err) return logger.error(err);
        logger.info(stdout);
      });
    }
  }
}

export const prisma = new Prisma();
