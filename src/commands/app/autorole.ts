import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import { PermissionsBitField } from "discord.js";

export default commandModule({
  type: CommandType.Slash,
  name: "autorole",
  description: "manage autorole system",
  plugins: [
    publishConfig({
      defaultMemberPermissions: PermissionsBitField.Flags.ManageGuild,
      integrationTypes: ["Guild"],
      contexts: [IntegrationContextType.GUILD],
    }),
  ],
  async execute(ctx) {},
});
