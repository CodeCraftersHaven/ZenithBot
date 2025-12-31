import { scheduledTask } from "@sern/handler";
import { syncDatabase } from "#utils";

export default scheduledTask({
  name: "sync guild database",
  trigger: "0 0 */1 * *",
  async execute(tasks, { deps }) {
    await syncDatabase(deps["@sern/logger"]!, deps["@prisma/client"], deps["@sern/client"]!)
  },
});
