import express from 'express';
import { PrismaClient } from '@prisma/client';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';

const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.json());
interface LineData {
    units: number;
    price: number;
    product: {
        barcode: string;
        productName: string;
        quantity: number;
        price: number;
    };
}

app.post('/invoices', async (req, res) => {
    try {
        const data = req.body;

        const currentDate = new Date();
        const invoice = await prisma.invoice.create({
            data: {
                Date: currentDate,
                employee_id: data.Userid, // ใช้ Userid จากคำขอ
                total: data.totalPrice, // ใช้ราคารวมจากคำขอ
            },
        });

        // สร้าง Line Items จากข้อมูลในคำขอ
        for (const productData of data.line) {
            await prisma.line.create({
                data: {
                    inv_id: invoice.id, // ใช้ ID ของ Invoice ที่สร้าง
                    barcode: productData.product.barcode, // ใช้ Barcode ของสินค้าจากคำขอ
                    quantity: productData.product.quantity, // ใช้จำนวนสินค้าจากคำขอ
                    cost: productData.product.cost,
                    price: productData.product.price, // ใช้ราคาของสินค้าจากคำขอ
                    employeeId: data.Userid, // ใช้ Userid จากคำขอ
                }
            });
        }
        res.status(201).json({ message: 'Invoice created successfully', invoiceId: invoice.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating invoice' });
    }
});

app.post('/updateQtyProduct', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        for (const productData of data.line) {
            const barcode = productData.product.barcode;
            const quantityToDeduct = parseInt(productData.product.quantity);
            const product = await prisma.product.findUnique({
                where: {
                    barcode: barcode
                }
            });

            if (product) {
                const currentQuantity = product.quan;

                // Calculate the new quantity after deduction
                const newQuantity = currentQuantity - quantityToDeduct;
                if (newQuantity >= 0) {
                    // Update the product's quantity (quan) in the database
                    await prisma.product.update({
                        where: {
                            barcode: barcode
                        },
                        data: {
                            quan: newQuantity
                        }
                    });
                } else {
                    res.status(500).json({ error: 'Error quantity of product.' });
                }
            } else {
                console.error(`Product with barcode ${barcode} not found.`);
            }
        }
        res.status(201).json({ message: 'Product quantities updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while updating product quantities.' });
    }
});


app.get('/getInvoice', async (req: Request, res: Response) => {
    const results = await prisma.invoice.findMany({
        include: {
            line: {
                include: {
                    Product: true // รวมข้อมูล Product
                }
            }
        },
    });
    res.status(200).json(results);
});

app.get('/invoice/sumemployee', async (req, res) => {
    try {
        // Execute the SQL query using Prisma
        const result = await prisma.$queryRaw`
         SELECT employee_id,SUM(total) AS total_sum,
         DATE_FORMAT(Date, '%Y-%m-%d') AS formatted_date
         FROM Invoice
         GROUP BY employee_id, formatted_date;
      `;

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
});

app.get('/getInvoice/new', async (req: Request, res: Response) => {

    const results = await prisma.invoice.findMany({
        include: {
            line: {
                include: {
                    Product: true // รวมข้อมูล Product
                }
            }
        },
        orderBy: {
            id: 'desc'
        },
        take: 1
    });
    res.status(200).json(results[0]); // เนื่องจาก take: 1 จะได้รายการเดียวเท่านั้น
});


app.get('/getReturnInvoice/', async (req: Request, res: Response) => {
    const invoice_id = req.body.id;
    const barcode = req.body.barcode;
    const results = await prisma.invoice.findUnique({
        where: {
            id: parseInt(invoice_id),
        },
        include: {
            line: {
                where: {
                    barcode: barcode,
                }
            }
        },
    });

    res.status(200).json(results?.line);

});

module.exports = app;

