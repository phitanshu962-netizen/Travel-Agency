"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = require("./database");
class UserService {
    async createOrUpdateUser(userData) {
        return await database_1.databaseService.createOrUpdateUser(userData);
    }
    async getUserById(id) {
        return await database_1.databaseService.getUserById(id);
    }
    async updateUserOnlineStatus(userId, isOnline) {
        await database_1.databaseService.updateUserOnlineStatus(userId, isOnline);
    }
    async getOnlineUsers() {
        return await database_1.databaseService.getOnlineUsers();
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
