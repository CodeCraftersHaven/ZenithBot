import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import { Client } from "discord.js";

export default class SelfRoles {
    private db: PrismaClient = Service("@prisma/client");
    private c: Client = Service("@sern/client");
    enabled: boolean;
    constructor(enabled: boolean = false) {
        this.enabled = enabled;
    }

    async getRoles(guildId: string) {
        const roles = await this.db.selfRoles.findMany({ where: { guildId } });
        return roles;
    }

    // async addRole(guildId: string, roleId: string) {
    //     await this.db.selfRoles.create({ data: { guildId, roleId } });
    // }

    // async removeRole(guildId: string, roleId: string) {
    //     await this.db.selfRoles.delete({ where: { guildId } });
    // }

    // async getRole(guildId: string, roleId: string) {
    //     const role = await this.db.selfRoles.findUnique({ where: { guildId_roleId: { guildId, roleId } } });
    //     return role;
    // }

    // async getRolesForUser(guildId: string, userId: string) {
    //     const roles = await this.db.selfRoles.findMany({ where: { guildId }, select: { roleId: true } });
    //     const userRoles = await c.guilds.cache.get(guildId)?.members.fetch(userId);
    //     return roles.filter((role) => userRoles?.roles.cache.has(role.roleId));
    // }
}
export type selfroles = typeof SelfRoles;