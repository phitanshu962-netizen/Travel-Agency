import { databaseService } from './database';
import { User } from './database';

export class UserService {
  async createOrUpdateUser(userData: {
    id: string;
    email?: string;
    displayName?: string;
    avatar_url?: string;
    bio?: string;
    isAnonymous?: boolean;
  }): Promise<User> {
    return await databaseService.createOrUpdateUser(userData);
  }

  async getUserById(id: string): Promise<User | null> {
    return await databaseService.getUserById(id);
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await databaseService.updateUserOnlineStatus(userId, isOnline);
  }

  async getOnlineUsers(): Promise<User[]> {
    return await databaseService.getOnlineUsers();
  }
}

export const userService = new UserService();
