import express from "express";
import { read, write } from '../src/utils/files.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Joi from 'joi';
import dayjs from 'dayjs';

const validacionmodelos = Joi.object({
    id: Joi.number().integer().min(1).required(),
    Patreon: Joi.string().min(1).valid('Wicked', 'B3dserk', 'Star_Wars').required(),
    Tipo_Modelo: Joi.string().min(1).valid('Escultura', 'Busto', 'Diorama').required(),
    Pelicula: Joi.string().min(1).required(),
    Nombre_Modelo: Joi.string().min(1).required(),
    Medida: Joi.string().min(3).pattern(/mm$/).required(),
    Escala: Joi.string().min(1).valid('1/6', '1/4').required(),
    ipAddress: Joi.string().optional(), // Permitir ipAddress
    createdAt: Joi.date().iso().optional(), // Permitir createdAt
    updatedAt: Joi.date().iso().optional() // Permitir createdAt
});

export const modelosFileRouter = express.Router();

const captureInfoMiddleware = (req, res, next) => {
    req.ipAddress = req.ip || req.connection.remoteAddress; // Captura la IP
    const currentDateTime = dayjs().toISOString(); // Captura la fecha y hora actual en formato ISO

    if (req.method === 'POST') {
        req.createdAt = currentDateTime; // Crea createdAt para POST
    }

    if (req.method === 'PUT') {
        req.updatedAt = currentDateTime; // Crea updatedAt para PUT
    }
    next(); // Llama a la siguiente función middleware o ruta
};

const accessLogMiddleware = (req, res, next) => {
    const timestamp = dayjs().format('DD-MM-YYYY HH:mm:ss'); // Formato de fecha y hora
    const method = req.method; // Método HTTP
    const url = req.originalUrl; // Ruta solicitada
    const headers = JSON.stringify(req.headers); // Encabezados de la solicitud

    // Construir la línea de log
    const logLine = `${timestamp} [${method}] [${url}] [${headers}]\n`;

    // Ruta del archivo de log
    const downloadsFolder = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
    const logFilePath = path.join(downloadsFolder, 'access_log.txt');

    // Escribir en el archivo
    fs.appendFile(logFilePath, logLine, (err) => {
        if (err) {
            console.error('Error al escribir en el archivo de log:', err);
        }
    });

    next(); // Pasar al siguiente middleware o ruta
};

modelosFileRouter.get("/", accessLogMiddleware, (req, res) => {
    const modelos = read();

    const filterKey = req.query.filter;
    const filterValue = req.query.value;
    const limit = parseInt(req.query.limit, 10);

    let filteredModelos = modelos;

    if (filterKey && filterValue) {
        filteredModelos = modelos.filter(modelo => {
            if (modelo.hasOwnProperty(filterKey)) {
                return modelo[filterKey] === filterValue;
            }
            return false;
        });
    }

    if (!isNaN(limit) && limit > 0) {
        filteredModelos = filteredModelos.slice(0, limit);
    }

    // Generar el PDF
    const doc = new PDFDocument();
    const downloadsFolder = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
    const pdfPath = path.join(downloadsFolder, 'modelos.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(25).text('Lista de Modelos', { align: 'center' });
    doc.moveDown();

    filteredModelos.forEach(modelo => {
        doc.fontSize(12).text(`ID: ${modelo.id}, Patreon: ${modelo.Patreon}, Tipo Modelo: ${modelo.Tipo_Modelo}, Pelicula: ${modelo.Pelicula}, Nombre Modelo: ${modelo.Nombre_Modelo}, Medida: ${modelo.Medida}, Escala: ${modelo.Escala}.`);
        doc.moveDown();
    });

    doc.end();

    // Responder con los registros filtrados
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(filteredModelos));
});

modelosFileRouter.post("/", captureInfoMiddleware, accessLogMiddleware, (req, res) => {
    const modelos = read();
    const modelo = {
        ...req.body,
        id: modelos.length + 1,
        ipAddress: req.ipAddress, // Agrega la IP al modelo
        createdAt: req.createdAt // Formato ISO para la fecha/hora
    };

    const { error } = validacionmodelos.validate(modelo);

    if (error) {
        let errorMessage = 'Error en la validación de entrada.';
        switch (error.details[0].context.key) {
            case 'Patreon':
                errorMessage = 'El Patreon es obligatorio y debe ser B3dserk, Wicked o Star_Wars.';
                break;
            case 'Tipo_Modelo':
                errorMessage = 'El Tipo de modelo es obligatorio y debe ser: Escultura, Busto o Diorama.';
                break;
            case 'Pelicula':
                errorMessage = 'El nombre de la película es obligatorio.';
                break;
            case 'Nombre_Modelo':
                errorMessage = 'El nombre del modelo es obligatorio.';
                break;
            case 'Medida':
                errorMessage = 'La medida es obligatoria y debe contener 3 dígitos y terminar en mm.';
                break;
            case 'Escala':
                errorMessage = 'La escala del modelo es obligatoria y debe ser 1/6 o 1/4.';
                break;
            default:
                errorMessage = 'Error en la validación de entrada.';
        }
        return res.status(400).json({ error: errorMessage });
    }

    modelos.push(modelo);
    write(modelos);
    res.status(201).json({
        ...modelo
    });
});

modelosFileRouter.get('/:Patreon', accessLogMiddleware, (req, res) => {
    const modelos = read();
    const modelo = modelos.find(modelo => modelo.Patreon === req.params.Patreon);
    if (modelo) {
        res.json(modelo);
    } else {
        res.status(404).end();
    }
})

modelosFileRouter.put('/:Nombre_Modelo', captureInfoMiddleware, accessLogMiddleware, (req, res) => {
    const modelos = read();
    let modelo = modelos.find(modelo => modelo.Nombre_Modelo === req.params.Nombre_Modelo);

    if (modelo) {
        modelo = {
            ...modelo,
            ...req.body,
            ipAddress: req.ipAddress, // Agrega la IP al modelo
            updatedAt: req.updatedAt // Agrega updatedAt al modelo
        };

        modelos[
            modelos.findIndex(modelo => modelo.Nombre_Modelo === req.params.Nombre_Modelo)
        ] = modelo;

        const { error } = validacionmodelos.validate(modelo);
        if (error) {
            let errorMessage;
            switch (error.details[0].context.key) {
                case 'Patreon':
                    errorMessage = 'El Patreon es obligatorio y debe ser B3dserk, Wicked o Star_Wars.';
                    break;
                case 'Tipo_Modelo':
                    errorMessage = 'El Tipo de modelo es obligatorio y debe ser: Escultura, Busto o Diorama.';
                    break;
                case 'Pelicula':
                    errorMessage = 'El nombre de la película es obligatorio.';
                    break;
                case 'Nombre_Modelo':
                    errorMessage = 'El nombre del modelo es obligatorio.';
                    break;
                case 'Medida':
                    errorMessage = 'La medida es obligatoria y debe contener 3 dígitos y terminar en mm.';
                    break;
                case 'Escala':
                    errorMessage = 'La escala del modelo es obligatoria y debe ser 1/6 o 1/4.';
                    break;
                default:
                    errorMessage = 'Error en la validación de entrada.';
            }
            return res.status(400).json({ error: errorMessage });
        }

        write(modelos);
        res.json(modelo);
    } else {
        res.status(404).end();
    }
})

modelosFileRouter.delete('/:id', accessLogMiddleware, (req, res) => {
    const modelos = read();
    const modelo = modelos.find(modelo => modelo.id === parseInt(req.params.id));
    if (modelo) {
        modelos.splice(
            modelos.findIndex(modelo => modelo.id === parseInt(req.params.id)),
            1
        );
        write(modelos);
        res.json(modelo);
    } else {
        res.status(404).end();
    }
})

modelosFileRouter.put('/actualizar', accessLogMiddleware, (req, res) => {
    const { fieldName, newValue } = req.body;
    const modelos = read();

    // Validar que se proporcionen el campo y el nuevo valor
    if (!fieldName || newValue === undefined) {
        return res.status(400).json({ error: "Se requiere 'fieldName' y 'newValue' en el cuerpo de la solicitud." });
    }

    const updatedAt = dayjs().format('HH:mm DD-MM-YYYY'); // Obtener la fecha y hora actual en el formato deseado

    const { error } = validacionmodelos.validate(modelos);
    if (error) {
        let errorMessage;
        switch (error.details[0].context.key) {
            case 'Patreon':
                errorMessage = 'El Patreon es obligatorio y debe ser B3dserk, Wicked o Star_Wars.';
                break;
            case 'Tipo_Modelo':
                errorMessage = 'El Tipo de modelo es obligatorio y debe ser: Escultura, Busto o Diorama.';
                break;
            case 'Pelicula':
                errorMessage = 'El nombre de la película es obligatorio.';
                break;
            case 'Nombre_Modelo':
                errorMessage = 'El nombre del modelo es obligatorio.';
                break;
            case 'Medida':
                errorMessage = 'La medida es obligatoria y debe contener 3 dígitos y terminar en mm.';
                break;
            case 'Escala':
                errorMessage = 'La escala del modelo es obligatoria y debe ser 1/6 o 1/4.';
                break;
            default:
                errorMessage = 'Error en la validación de entrada.';
        }
    }
    modelos.forEach(modelo => {
        modelo[fieldName] = newValue; // Actualizar el campo especificado
        modelo.updated_at = updatedAt; // Agregar el campo updated_at con la fecha/hora actual
    });
    write(modelos); // Guardar los cambios en el archivo
    res.status(200).json(modelos);
})