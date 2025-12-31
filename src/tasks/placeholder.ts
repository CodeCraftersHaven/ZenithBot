import { scheduledTask } from "@sern/handler";

export default scheduledTask({
  name: "placeholder",
  trigger: "1/10 * * * *",
  async execute(tasks, { deps }) {
    deps["@sern/logger"].info("placeholder task executed");
  },
});
