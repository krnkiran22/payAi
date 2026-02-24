import { PrismaClient, Category, Status } from '@prisma/client';

export class DbService {
    private static _prisma: PrismaClient | null = null;

    private static get prisma() {
        if (!this._prisma) {
            this._prisma = new PrismaClient();
        }
        return this._prisma;
    }

    static async createExpense(data: {
        username: string;
        category: Category;
        amount: number;
        vendor: string;
        expenseDate: Date;
        paymentMethod: string;
        currency?: string;
        notes?: string;
        invoiceDriveLink?: string;
        paymentDriveLink?: string;
        invoiceLocalPath: string;
        paymentLocalPath?: string;
        rawOcrText: string;
        groqRawResponse: string;
        status: Status;
    }) {
        return await this.prisma.expense.create({
            data,
        });
    }

    static async getExpensesByUser(username: string) {
        return await this.prisma.expense.findMany({
            where: { username },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async countUserCategoryExpenses(username: string, category: Category) {
        return await this.prisma.expense.count({
            where: { username, category },
        });
    }
}
