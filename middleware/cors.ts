import cors from "cors";
import { Express } from "express";

const   CorsAperto = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => callback(null, true);

const whitelist : string[] = [
    "http://localhost:3000",
    "http://localhost:4200",
    "http://localhost:3001",
    "http://localhost:8080",
    "http://127.0.0.1:5500",
    "https://bosio-crud-server.onrender.com"
]

const corsOptions = {
    origin: CorsAperto,
    credentials: true
};

const MiddlewareCors = (app : Express) => {
    app.use("/", cors(corsOptions));
};

export { MiddlewareCors };