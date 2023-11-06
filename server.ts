import { Request, Response, NextFunction } from "express";
var express = require('express');
var cors = require('cors');
var app = express();
var port = 3001
var bodyParser = require('body-parser');


app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(require('./Controller/UserController'));
app.use(require('./Controller/ProductController'));
app.use(require('./Controller/InvoiceController'));

app.listen(port, () => {
    console.log('Example app listening on port', port);
})