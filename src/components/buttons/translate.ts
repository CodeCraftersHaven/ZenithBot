import { languageModal } from "#utils";
import { commandModule, CommandType } from "@sern/handler";

export default commandModule({
  type: CommandType.Button,
  async execute(ctx) {
    await ctx.showModal(languageModal());
  },
});
