import express from 'express';
import { 
    getModelos, 
    postModelo, 
    getModeloByPatreon, 
    putModeloByNombre, 
    deleteModeloById 
} from './controlador/controller.js';

const app = express();

app.use(express.json());

app.get('/modelos', getModelos);
app.post('/modelos', postModelo);
app.get('/modelos/:Patreon', getModeloByPatreon);
app.put('/modelos/:Nombre_Modelo', putModeloByNombre);
app.delete('/modelos/:id', deleteModeloById);

app.listen(3000, () => {
    console.log('Server is running on port 3000'); 
});
