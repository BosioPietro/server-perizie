import express, { Express, Request, Response, NextFunction } from "express";
import FormData  from "express-form-data";

const LoggingRichieste = (app : Express) => {
    app.use("/", (req : Request, res : Response, next : NextFunction) => {
        console.log(`>--> ${req.method} ${req.originalUrl}`)
        next();
    })
}
const MiddlewareJson = (app : Express) => {
    app.use("/", express.json({ "limit": "50mb" }));
}

const MiddlewareBodyParser = (app : Express) => {
    app.use("/", express.urlencoded({ "extended": true }));
}

const MiddlewareLogParametri = (app : Express) => {
    app.use("/", (req : Request, res : Response, next : NextFunction) => {
        const Vuoto = (o : object) : boolean => !Object.keys(o).length;
    
        if(!Vuoto(req["query"]))
        {
            console.log(`    ${JSON.stringify(req["query"])}`)
        }
        else if(!Vuoto(req["body"]))
        {
            console.log(`    ${JSON.stringify(req["body"])}`)
        }
        next();
    })    
}

const MiddlewareFormData = (app : Express) => {
    app.use(FormData.parse());
}

export { LoggingRichieste, MiddlewareJson, MiddlewareBodyParser, MiddlewareLogParametri, MiddlewareFormData }