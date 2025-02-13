import { Services } from "@sern/handler"

export const r6tracker = () => {
    const [client, logger] = Services("@sern/client", "@sern/logger");
}