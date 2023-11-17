import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
const app = express();
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config()

app.get('/dashboard/salebyCateagory', async (req, res) => {
    try {
        // Execute the SQL query using Prisma
        const result: { type: string; sale_date: Date; total_quantity: number }[] = await prisma.$queryRaw`
            SELECT Product.type, DATE(line.createdAt) AS sale_date,
            SUM(line.quantity) AS total_quantity
            FROM line
            JOIN Product ON line.barcode = Product.barcode
            GROUP BY Product.type, DATE(line.createdAt)`;

        // Process the raw result to create the desired structure
        const processedResult: Record<string, { type: string; quantity: number }[]> = result.reduce(
            (acc, entry) => {
                const date = entry.sale_date.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push({
                    type: entry.type,
                    quantity: entry.total_quantity,
                });
                return acc;
            },
            {} as Record<string, { type: string; quantity: number }[]> // Add an explicit index signature
        );

        // Ensure all types are included for each date with quantity 0 if not present
        const allTypes: string[] = ["1", "2", "3", "4", "5"]; // Add your 5 types here

        Object.keys(processedResult).forEach(date => {
            const existingTypes = processedResult[date].map(entry => entry.type);
            const missingTypes = allTypes.filter(type => !existingTypes.includes(type));

            processedResult[date].push(...missingTypes.map(type => ({ type, quantity: 0 })));
        });

        // Sort the result by date
        const sortedResult: Record<string, { type: string; quantity: number }[]> = {};
        Object.keys(processedResult).sort().forEach(date => {
            sortedResult[date] = processedResult[date];
        });

        res.json(sortedResult);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});



app.get('/expenses', async (req: Request, res: Response) => {

    try {
        const productStats: ProductStat[] = await prisma.$queryRaw`
        SELECT DATE_FORMAT(DATE(createdAt), '%Y-%m-%d') AS date,
        SUM(quantity * price) AS Total_Product,
        SUM((quantity * price) - (quantity * cost) - (quantity * discount)) AS total_profit,
        SUM(quantity * cost) AS Total_costFromProduct,
        SUM(quantity * discount) AS Total_Discount
        FROM line GROUP BY date`;

        const Notesumary = await prisma.$queryRaw`
        SELECT DATE_FORMAT(DATE(Note.Date), '%Y-%m-%d') AS formattedDate, SUM(Note.value) AS totalExpense
        FROM Note GROUP BY formattedDate`;

        const productStatsJSON = JSON.parse(JSON.stringify(productStats));
        const NotesumaryJSON = JSON.parse(JSON.stringify(Notesumary));

        // Merge the arrays based on the date
        const mergedData = productStatsJSON.map((productItem: any) => {
            const matchingNote = NotesumaryJSON.find((noteItem: any) => noteItem.formattedDate === productItem.date);
            return {
                date: productItem.date,
                Total_Product: productItem.Total_Product,
                total_profit: productItem.total_profit,
                Total_costFromProduct: productItem.Total_costFromProduct,
                Total_Discount: productItem.Total_Discount,
                totalExpense: matchingNote ? parseInt(matchingNote.totalExpense) : 0
            };
        });
        res.json({ result: mergedData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});




interface Expense {
    formattedDate: string;
    totalExpense: number;
}

interface ProductStat {
    saleDate: string;
    totalProduct: number;
    totalProfit: number;
    totalCostFromProduct: number;
    totalDiscount: number;
}


app.get('/dashboard/getOrder', async (req, res) => {
    try {
        const resultProduct = await prisma.invoice.findMany({
            select: {
                Date: true,
                id: true,
            },
        })

        res.json(resultProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});

app.get('/dashboard/lastOrder', async (req, res) => {
    try {
        const lastOrder = await prisma.line.findMany({
            orderBy: {
                id: 'desc', // Assuming 'id' is the auto-incrementing ID field
            },
            take: 5,
        });

        res.json(lastOrder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});

module.exports = app;
