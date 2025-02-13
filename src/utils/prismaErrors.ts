import {
	PrismaClientRustPanicError,
	PrismaClientValidationError,
	PrismaClientKnownRequestError,
	PrismaClientInitializationError,
	PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/library";
import { logger } from "#utils";

export function handlePrismaError(error: PrismaError): void {
	switch (error.constructor) {
		case PrismaClientValidationError:
			logger.error(
				`Unable to connect to PrismaClientDB.\nReason: Validation Error \nMessage: ${error.message}`,
			);
			break;
		case PrismaClientRustPanicError:
			logger.error(
				`Unable to connect to PrismaClientDB.\nReason: Rust Panic Error \nMessage: ${error.message}`,
			);
			break;
		case PrismaClientKnownRequestError:
			logger.error(
				`Unable to connect to PrismaClientDB.\nReason: Known Request Error \nMessage: ${error.message}`,
			);
			break;
		case PrismaClientInitializationError:
			logger.error(
				`Unable to connect to PrismaClientDB.\nReason: Initialization Error \nMessage: ${error.message}`,
			);
			break;
		case PrismaClientUnknownRequestError:
			logger.error(
				`Unable to connect to PrismaClientDB.\nReason: Unknown Request Error \nMessage: ${error.message}`,
			);
			break;
		default:
			logger.error(
				`Unable to connect to PrismaClientDB.\nReason: Unhandled Prisma Error \nMessage: ${error.message}`,
			);
	}
}
type PrismaError =
| PrismaClientValidationError
| PrismaClientRustPanicError
| PrismaClientKnownRequestError
| PrismaClientInitializationError
| PrismaClientUnknownRequestError;