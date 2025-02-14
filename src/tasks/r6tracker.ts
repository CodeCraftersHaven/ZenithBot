import { scheduledTask } from "@sern/handler";
import { Collection, GuildMember, User } from "discord.js";

let r6 = new Collection<string, number[]>();
let total = 0;
let siegePlayersCount = 0;
let uniqueMembers = new Set<string>();

export default scheduledTask({
  trigger: "* * * * *", //Should find a better time to run this task
  execute(_, { deps }) {
    const [client, logger] = [deps["@sern/client"], deps["@sern/logger"]];
    client.guilds.cache.forEach(async (g) => {
      try {
        let membersList: Collection<string, GuildMember>;
        const members: GuildMember[] = [];
        const clientUsers: User[] = [];
        const member = g.members.cache.find((x) => x.user.id);
        if (member) members.push(member);

        const clientUser = client.users.cache.find((x) => x);
        if (clientUser) clientUsers.push(clientUser);

        // Check if any user in clientUsers matches a user in members
        if (!members.some((m) => clientUsers.some((u) => u.id === m.user.id))) {
          membersList = await g.members.fetch();
        } else {
          membersList = g.members.cache;
        }

        membersList.forEach((member) => {
          if (member.user.bot) return;
          if (
            member.presence?.activities.some((activity) =>
              activity.name.includes("Siege"),
            )
          ) {
            siegePlayersCount++;

            if (!uniqueMembers.has(member.id)) {
              uniqueMembers.add(member.id);
              total++;
            }
          }
        });

        r6.set(g.id, [siegePlayersCount, total]);
        // console.log(`Guild ID: ${g.id} has ${siegePlayersCount} Siege Player${siegePlayersCount > 1 || siegePlayersCount < 1 ? "s" : ""}`);
      } catch (error) {
        return logger.error(error);
      }
    });
    r6.forEach((_, g, [s, t]) => {
      // console.log(`_(${_[0]})\ng(${g})\ns(${s})-t(${t})`)
    });
  },
});
