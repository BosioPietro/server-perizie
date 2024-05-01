import { Express, Request, Response } from "express";

const GestioneErrori = (app : Express) => {
    app.use("/", (req : Request, res : Response,) => res.status(404).send("Api non trovata"));
}

const LoggingErrori = (app : Express) => {
    app.use("/", (err: Error) => console.log("*** ERRORE SERVER ***", err["message"]))
}

export { GestioneErrori, LoggingErrori }