import { commandModule, CommandType } from "@sern/handler";

export default commandModule({
  type: CommandType.Button,
  execute: async (ctx, { deps }) => {},
});
