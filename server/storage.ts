
import { users, messages, type User, type InsertUser, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User Operations
  getUser(telegramId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVipStatus(telegramId: string, isVip: boolean): Promise<User>;
  updateUserVipStatusByUsername(username: string, isVip: boolean): Promise<User | undefined>;
  getGlobalStats(): Promise<{ totalUsers: number; vipUsers: number }>;
  getAllVips(): Promise<User[]>;

  // Message Operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(userId: number): Promise<Message[]>;
  clearMessages(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username.replace('@', '')));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserVipStatus(telegramId: string, isVip: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isVip })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user;
  }

  async updateUserVipStatusByUsername(username: string, isVip: boolean): Promise<User | undefined> {
    const cleanUsername = username.replace('@', '');
    const [user] = await db
      .update(users)
      .set({ isVip })
      .where(eq(users.username, cleanUsername))
      .returning();
    return user;
  }

  async getGlobalStats(): Promise<{ totalUsers: number; vipUsers: number }> {
    const allUsers = await db.select().from(users);
    const vipUsers = allUsers.filter(u => u.isVip).length;
    return {
      totalUsers: allUsers.length,
      vipUsers
    };
  }

  async getAllVips(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isVip, true));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessages(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(50);
  }

  async clearMessages(userId: number): Promise<void> {
    await db.delete(messages).where(eq(messages.userId, userId));
  }
}

export const storage = new DatabaseStorage();
