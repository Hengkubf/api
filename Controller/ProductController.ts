import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
const express = require('express')
const app = express()
const prisma = new PrismaClient();

app.get('/getProduct', async (req: Request, res: Response) => {
    const results = await prisma.product.findMany({
    });
    res.status(200).json(results);
});

app.post('/createProduct', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const product = await prisma.product.create({
            data: {
                barcode: data.code,
                type: data.type,
                name: data.name,
                cost: parseInt(data.cost),
                sale: parseInt(data.sale),
                quan: parseInt(data.quan),
            },
        });
        res.status(201).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
});
app.post('/updateProduct', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const products = await prisma.product.update({
            where: {
                barcode: data.code,
            },
            data: {
                type: data.type,
                name: data.name,
                cost: parseInt(data.cost),
                sale: parseInt(data.sale),
                quan: parseInt(data.quan),
            },
        });
        res.status(201).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
});

app.get('/getProduct/:barcode', async (req: Request, res: Response) => {
    const productId = req.params.barcode; // รับรหัสสินค้าจากพารามิเตอร์ใน URL

    try {
        const product = await prisma.product.findUnique({
            where: {
                barcode: productId, // แปลงรหัสสินค้าเป็นตัวเลขและค้นหาข้อมูลสินค้า
            },
        });

        if (product) {
            res.json(product); // ส่งข้อมูลสินค้าเป็นการตอบคำขอ JSON
        } else {
            res.status(404).json({ message: 'ไม่พบสินค้า' }); // จัดการกรณีเมื่อไม่พบสินค้า
        }
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});



app.post('/updateReturnProduct', async (req: Request, res: Response) => {

    try {
        const data = req.body;
        let products;
        products = await prisma.returnProduct.update({
            where: {
                id: parseInt(data.code),
            },
            data: {
                status: parseInt(data.status),
                quan: parseInt(data.quan),
            },
        });
        if (parseInt(data.status) === 3) {
            try {
                const barcode = String(data.productid);
                const quantityToDeduct = parseInt(data.quan);
                const product = await prisma.product.findUnique({
                    where: {
                        barcode: barcode
                    }
                });

                if (!product) {
                    return res.status(500).json({ message: 'No Product' });
                }

                const currentQuantity = product.quan;
                const newQuantity = currentQuantity + quantityToDeduct;

                if (newQuantity < 0) {
                    return res.status(500).json({ error: 'Error quantity of product.' });
                }

                await prisma.product.update({
                    where: {
                        barcode: barcode
                    },
                    data: {
                        quan: newQuantity
                    }
                });

                return res.status(201).json({ message: 'Product quantities updated successfully' });
            } catch (error) {
                return res.status(500).json({ error: 'An error occurred while updating product quantities.' });
            }
        }



        return res.status(201).json(products);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
});



module.exports = app;
