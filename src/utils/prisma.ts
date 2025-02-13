import { PrismaClient } from '@prisma/client';
import { logger, handlePrismaError } from '#utils';
import { exec } from 'child_process';

class Prisma extends PrismaClient {
	constructor() {
		super();
	}
	override async $disconnect() {
		await super.$disconnect()
			.then(() => logger.warn('Disconnected from Prisma ORM!'))
			.catch((e) => logger.error(e));
	}
	override async $connect() {
		// exec('npx prisma generate', (err, stdout, stderr) => {
		// 	if (err) {
		// 		logger.error(err);
		// 		return;
		// 	}
		// 	logger.info(stdout);
		// });
		await super.$connect()
			.then(() => logger.info('Connected to Prisma ORM'))
			.catch(handlePrismaError);
		// exec('npx prisma db push', (err, stdout, stderr) => {
		// 	if (err) {
		// 		logger.error(err);
		// 		return;
		// 	}
		// 	logger.info(stdout);
		// });
	}
}

export const prisma = new Prisma();