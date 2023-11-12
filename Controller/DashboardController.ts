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
        const result = await prisma.$queryRaw`
    SELECT Product.type, DATE(line.createdAt) AS sale_date,
    SUM(line.quantity) AS total_quantity
    FROM  line JOIN Product ON line.barcode = Product.barcode
    GROUP BY Product.type, DATE(line.createdAt)`;

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});

// app.get('/dashboard/Summary', async (req, res) => {
//     try {
//         const resultProduct = await prisma.$queryRaw`
//         SELECT DATE(createdAt) AS sale_date,
//         SUM(quantity * price) AS Total_Product,
//         SUM((quantity * price) - (quantity * cost)) AS total_profit,
//         SUM(quantity * cost) AS Total_costFromProduct
//         FROM line GROUP BY DATE(createdAt)`;

//         res.json(resultProduct);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'An error occurred while fetching data.' });
//     }
// });




// app.get('/expenses', async (req, res) => {

//     try {
//         const expenses = await prisma.$queryRaw`SELECT DATE(Date) AS formattedDate, SUM(value) AS totalExpense FROM Note GROUP BY formattedDate`;

//         const resultProduct = await prisma.$queryRaw`
//         SELECT DATE(createdAt) AS sale_date,
//         SUM(quantity * price) AS Total_Product,
//         SUM((quantity * price) - (quantity * cost)) AS total_profit,
//         SUM(quantity * cost) AS Total_costFromProduct
//         FROM line GROUP BY DATE(createdAt)`;



//         res.json({ expenses: expenses, result: resultProduct });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'An error occurred while fetching data.' });
//     }
// });


interface Expense {
    formattedDate: string;
    totalExpense: number;
}

interface ProductStat {
    saleDate: string;
    totalProduct: number;
    totalProfit: number;
    totalCostFromProduct: number;
}

// Use the interfaces in your Express route
app.get('/dashboard/expensesAll', async (req, res) => {
    try {
        // Explicitly define the types for expenses and productStats
        const expenses: Expense[] = await prisma.$queryRaw`
        SELECT DATE(Date) AS formattedDate, SUM(value) AS totalExpense
        FROM Note
        GROUP BY formattedDate
      `;

        const productStats: ProductStat[] = await prisma.$queryRaw`
        SELECT DATE(createdAt) AS saleDate,
          SUM(quantity * price) AS totalProduct,
          SUM((quantity * price) - (quantity * cost)) AS totalProfit,
          SUM(quantity * cost) AS totalCostFromProduct
        FROM line
        GROUP BY saleDate
      `;

        // Merge the two data sets based on the date
        const mergedData = expenses.map((expense) => {
            const matchingProductStat = productStats.find((stat) => new Date(stat.saleDate).toLocaleDateString('en-US') === new Date(expense.formattedDate).toLocaleDateString('en-US'));

            return {
                Date: new Date(expense.formattedDate).toLocaleDateString('th-TH'),
                ExpenseFormNote: expense.totalExpense || 0,
                CostFromProduct: matchingProductStat ? matchingProductStat.totalCostFromProduct || 0 : 0,
                productProfit: matchingProductStat ? matchingProductStat.totalProfit || 0 : 0,
                totalIncome: matchingProductStat ? matchingProductStat.totalProduct || 0 : 0,
            };
        });

        res.json(mergedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});

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
