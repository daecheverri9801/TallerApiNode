import express from 'express';
import { routerModelos } from './routes/index.js';

const app = express();

app.use(express.json());

routerModelos(app);

app.listen(3000, () => {
    console.log('Server is running on port 3000'); 
});
