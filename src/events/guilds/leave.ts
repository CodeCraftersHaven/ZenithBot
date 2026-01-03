import { eventModule, EventType, Services } from "@sern/handler";
import { Events, Guild } from "discord.js";
import { Prisma } from "@prisma/client";

export default eventModule({
  type: EventType.Discord,
  name: Events.GuildDelete,
  async execute(guild: Guild) {
    const [logger, prisma] = Services("@sern/logger", "@prisma/client");

    const feedbackDoc = await prisma.feedback.findFirst();
    let feedbackUpdatePromise: Prisma.PrismaPromise<unknown> | undefined;

    if (feedbackDoc) {
      const systems = [
        "autorole",
        "counting",
        "giveaway",
        "selfroles",
        "tickets",
        "welcome",
      ] as const;
      const dataToUpdate: Prisma.FeedbackUpdateInput = {};

      for (const sys of systems) {
        const currentData = feedbackDoc[sys];
        if (currentData) {
          const usersKeep = currentData.users.filter(
            (u) => u.guildId !== guild.id,
          );
          const usersRemove = currentData.users.filter(
            (u) => u.guildId === guild.id,
          );

          if (usersRemove.length > 0) {
            const likesToRemove = usersRemove.filter(
              (u) => u.feeling === "like",
            ).length;
            const dislikesToRemove = usersRemove.filter(
              (u) => u.feeling === "dislike",
            ).length;

            dataToUpdate[sys] = {
              users: usersKeep,
              likes: Math.max(0, currentData.likes - likesToRemove),
              dislikes: Math.max(0, currentData.dislikes - dislikesToRemove),
            };
          }
        }
      }

      if (Object.keys(dataToUpdate).length > 0) {
        feedbackUpdatePromise = prisma.feedback.update({
          where: { id: feedbackDoc.id },
          data: dataToUpdate,
        });
      }
    }

    const transaction: Prisma.PrismaPromise<unknown>[] = [
      prisma.systems.deleteMany({ where: { id: guild.id } }),
      prisma.autorole.deleteMany({ where: { id: guild.id } }),
      prisma.counting.deleteMany({ where: { id: guild.id } }),
      prisma.giveaway.deleteMany({ where: { id: guild.id } }),
      prisma.selfRoles.deleteMany({ where: { id: guild.id } }),
      prisma.userTicket.deleteMany({ where: { id: guild.id } }),
    ];

    if (feedbackUpdatePromise) {
      transaction.push(feedbackUpdatePromise);
    }

    await prisma.$transaction(transaction).catch((e) => {
      logger.error({
        message: `Failed to remove guild data for ${guild.id}: ${e}`,
      });
    });
  },
});
