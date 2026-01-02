import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import {
  ApplicationCommandOptionType,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";

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
  options: [
    {
      name: "check",
      description: "check the current autorole",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "update",
      description: "update the autorole",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "role",
          description: "the role to set as the autorole",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
  ],
  async execute(ctx, { deps }) {
    await ctx.interaction.deferReply({
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });
    const [autorole, db] = [deps["systems"].AutoRole, deps["@prisma/client"]];
    const { options } = ctx;
    const arsys = await db.systems.findFirst({
      where: {
        id: ctx.guildId!,
        systems: {
          some: {
            name: "autorole",
            enabled: true,
          },
        },
      },
    });
    if (!arsys) {
      return await ctx.interaction.editReply(
        "You must enable the autorole system first!",
      );
    }

    const AR = new autorole(true);
    const subcommand = options.getSubcommand() as "update" | "check";
    const subcommands = {
      update: async () => {
        const role = options.getRole("role", true);
        await AR.setRole(ctx.guildId!, role.id);
        return await ctx.interaction.editReply(
          `The autorole has been set to <@&${role.id}>!`,
        );
      },
      check: async () => {
        const currentRole = await AR.getRole(ctx.guildId!);
        if (!currentRole) {
          return await ctx.interaction.editReply("Auto Role not set");
        }
        const role = ctx.guild?.roles.cache.get(currentRole);
        if (!role) {
          return await ctx.interaction.editReply("Selected role not found");
        }
        return await ctx.interaction.editReply(
          `The autorole is set to ${role}!`,
        );
      },
      default: async () => {
        return await ctx.interaction.editReply("Invalid subcommand");
      },
    };
    type Subcommands = keyof typeof subcommands;
    const result = (
      (await subcommands[subcommand as Subcommands]) || subcommands.default
    )();
    return result;
  },
});
