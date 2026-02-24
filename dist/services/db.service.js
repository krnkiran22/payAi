import { PrismaClient } from '@prisma/client';
export class DbService {
    static async createExpense(data) {
        return await this.prisma.expense.create({
            data,
        });
    }
    static async getExpensesByUser(username) {
        return await this.prisma.expense.findMany({
            where: { username },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async countUserCategoryExpenses(username, category) {
        return await this.prisma.expense.count({
            where: { username, category },
        });
    }
}
DbService.prisma = new PrismaClient();
