import express from "express";
import { modelosFileRouter } from "./modelos.file.routes.js";

const router = express.Router();

export function routerModelos(app) {
    app.use("/api/v1", router);

    router.use("/file/modelos", modelosFileRouter);
}