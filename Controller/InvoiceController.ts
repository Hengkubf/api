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
                    employeeId: data.Userid,
                    discount: parseFloat(productData.product.discount),
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
                    Product: true
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
    const invoice_id = req.query.id as string;
    const barcode = req.query.barcode as string;

    try {
        const results = await prisma.line.findFirst({
            where: {
                inv_id: parseInt(invoice_id),
                barcode: barcode,
            },
        });

        if (!results) {
            res.status(500).json({ status: "Data not Matches" });
        } else {
            res.status(200).json({ status: "ok", quantity: results.quantity });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "Fail" });
    }
});

app.post('/updateNote', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const products = await prisma.note.update({
            where: {
                id: parseInt(data.code),
            },
            data: {
                type: parseInt(data.type),
                value: parseInt(data.expense),
                text: data.note,
            },
        });
        res.status(201).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
});



app.post('/updateQtyReturnProduct', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const barcode = String(data.product.barcode);
        const quantityToDeduct = parseInt(data.product.quantity);
        const product = await prisma.product.findUnique({
            where: {
                barcode: barcode
            }
        });

        if (!product) {
            res.status(500).json({ message: 'No Product' });
        } else {
            const currentQuantity = product.quan;
            const newQuantity = currentQuantity - quantityToDeduct;
            if (newQuantity >= 0) {
                await prisma.product.update({
                    where: {
                        barcode: barcode
                    },
                    data: {
                        quan: newQuantity
                    }
                });
                res.status(201).json({ message: 'Product quantities updated successfully' });
            } else {
                res.status(500).json({ error: 'Error quantity of product.' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while updating product quantities.' });
    }
});


app.post('/createReturn', async (req: Request, res: Response) => {
    try {
        const data = req.body.product;
        const returnProduct = await prisma.returnProduct.create({
            data: {
                inv_id: parseInt(data.id),
                product_barcode: data.code,
                quan: data.quan,
                status: 1,
            },
        });
        res.status(201).json(returnProduct);
    } catch (error) {
        console.error(error);
        const data = req.body.product;

        res.status(500).json({ error: 'An error occurred while creating the user.', result: data });
    }
});

app.get('/getReportReturn', async (req: Request, res: Response) => {
    const results = await prisma.returnProduct.findMany({

    });
    res.status(200).json(results);
});

app.delete('/DeleteReturn', async (req: Request, res: Response) => {
    const data = req.body;
    const results = await prisma.returnProduct.delete({
        where: {
            id: data.id
        }
    });
    res.status(200).json(results);
});




module.exports = app;

