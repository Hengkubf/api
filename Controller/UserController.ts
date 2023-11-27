import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
const app = express();
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config()

app.get('/employees', async (req: Request, res: Response) => {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                Login: true,
            },
        });
        const formattedEmployees = employees.map((employee) => ({
            id: employee.id,
            fname: employee.fname,
            phone: employee.phone,
            username: employee.Login[0].username,
            password: employee.Login[0].password, // Update this if you need to handle passwords differently
            level: (employee.Login[0].level),
            status: (employee.Login[0].status),
        }));
        res.status(200).json(formattedEmployees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.post('/addemployee', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const user = await prisma.employee.create({
            data: {
                fname: data.fname,
                phone: data.phone,
                Login: {
                    create: {
                        username: data.username,
                        level: parseInt(data.level),
                        password: data.password,
                        status: 1,
                    }
                }
            },
        });
        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.post('/updateemployee', async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const users = await prisma.employee.update({
            where: {
                id: parseInt(data.id),
            },
            data: {
                fname: data.fname,
                phone: data.phone,
                Login:
                {
                    update: {
                        where: {
                            username: data.username,
                        },
                        data: {
                            level: parseInt(data.level),
                            password: data.password,
                            status: parseInt(data.status)
                        },
                    },
                }
            },
        })
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});
app.post('/login', async (req: Request, res: Response) => {
    const { csrfToken, username, password } = req.body;
    if (!csrfToken || !username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await prisma.login.findUnique({
        where: {
            username: username,
        },
    });

    if (!user || user.password !== password) {
        return res.status(401).json({ status: 'Invalid username or password' });
    } else if (user.status !== 1) {
        return res.status(401).json({ status: 'Account not active' });
    }
    const employeeinfo = await prisma.employee.findUnique({
        where: {
            id: user.id,
        }, include: {
            Login: {
                select: {
                    username: true,
                    status: true,
                    level: true,
                }
            },
        }
    })
    if (employeeinfo) {
        const responseObject = {
            userid: user.id,
            fname: employeeinfo.fname,
            username: employeeinfo.Login[0].username,
            level: employeeinfo.Login[0].level,
            status: employeeinfo.Login[0].status,
        };
        return res.status(200).json({ status: 'ok', user: responseObject });
    } else {
        return res.status(500).json({ status: 'fail' });
    }
});




app.post('/addNotes', (async (req, res) => {
    const { employee_id, type, value, text, date } = req.body;

    const newNote = await prisma.note.create({
        data: {
            employee_id: parseInt(employee_id), // แปลงเป็น Int
            type: parseInt(type), // แปลงเป็น Int
            value: parseInt(value), // แปลงเป็น Int
            text,
            Date: new Date(date), // เพิ่ม current date
        },
    });

    res.json(newNote);
}));


app.get('/  ', async (req: Request, res: Response) => {

    const results = await prisma.note.findMany({
    });
    res.status(200).json(results);
});

module.exports = app;
