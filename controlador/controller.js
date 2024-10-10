import { read, write } from '../src/files.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Joi from 'joi';

const validacionmodelos = Joi.object({
    id: Joi.number().integer().min(1).required(),
    Patreon: Joi.string().min(1).valid('Wicked', 'B3dserk', 'Star_Wars').required(),
    Tipo_Modelo: Joi.string().min(1).valid('Escultura', 'Busto', 'Diorama').required(),
    Pelicula: Joi.string().min(1).required(),
    Nombre_Modelo: Joi.string().min(1).required(),
    Medida: Joi.string().min(3).pattern(/mm$/).required(),
    Escala: Joi.string().min(1).valid('1/6', '1/4').required(),
});

export const getModelos = (req, res) => {
    const modelos = read();

    const doc = new PDFDocument();

    const downloadsFolder = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
    const pdfPath = path.join(downloadsFolder, 'modelos.pdf');

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(25).text('Lista de Modelos', { align: 'center' });
    doc.moveDown();

    modelos.forEach(modelo => {
        doc.fontSize(12).text(`ID: ${modelo.id}, Patreon: ${modelo.Patreon}, Tipo Modelo: ${modelo.Tipo_Modelo}, Pelicula: ${modelo.Pelicula}, Nombre Modelo: ${modelo.Nombre_Modelo}, Medida: ${modelo.Medida}, Escala: ${modelo.Escala}.`);
        doc.moveDown();
    });

    doc.end();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(modelos));
};

export const postModelo = (req, res) => {
    const modelos = read();
    const modelo = {
        ...req.body,
        id: modelos.length + 1
    };
    const { error } = validacionmodelos.validate(modelo);

    if (error) {
        let errorMessage;
        switch (error.details[0].context.key) {
            case 'Patreon':
                errorMessage = 'El Patreon es obligatorio y debe ser B3dserk, Wicked o Star_Wars.';
                break;
            case 'Tipo_Modelo':
                errorMessage = 'El Tipo de modelo es obligartorio y debe ser: Escultura, Busto o Diorama.';
                break;
            case 'Pelicula':
                errorMessage = 'El nombre de la película es obligatorio.';
                break;
            case 'Nombre_Modelo':
                errorMessage = 'El nombre del modelo es obligatorio.';
                break;
            case 'Medida':
                errorMessage = 'La medida es obligatoria debe contener 3 digito y terminar en mm.';
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
    res.status(201).json(modelos);
};

export const getModeloByPatreon = (req, res) => {
    const modelos = read();
    const modelo = modelos.find(modelo => modelo.Patreon === req.params.Patreon);
    if (modelo) {
        res.json(modelo);
    } else {
        res.status(404).end();
    }
};

export const putModeloByNombre = (req, res) => {
    const modelos = read();
    let modelo = modelos.find(modelo => modelo.Nombre_Modelo === req.params.Nombre_Modelo);
    if (modelo) {

        modelo = {
            ...modelo,
            ...req.body
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
                    errorMessage = 'El Tipo de modelo es obligartorio y debe ser: Escultura, Busto o Diorama.';
                    break;
                case 'Pelicula':
                    errorMessage = 'El nombre de la película es obligatorio.';
                    break;
                case 'Nombre_Modelo':
                    errorMessage = 'El nombre del modelo es obligatorio.';
                    break;
                case 'Medida':
                    errorMessage = 'La medida es obligatoria debe contener 3 digito y terminar en mm.';
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
};

export const deleteModeloById = (req, res) => {
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
};
