import _fs from "fs";
import _http from "http";
import { Response } from "express";
import { CreaToken } from "./encrypt.js";
import { Token } from "./encrypt.js";

const ReadFileAsync = (path : string) => {
    return new Promise<string>((resolve, reject) => {
        _fs.readFile(path,{ encoding: 'utf8' }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    })
}

const OggettoVuoto = (o : object) : boolean => !Object.keys(o).length;

type TipoServer  = _http.Server<typeof _http.IncomingMessage, typeof _http.ServerResponse> 

const RispondiToken = (res : Response, token : Token, messaggio : object | string, codice: number = 200) => {
    res.setHeader("authorization", CreaToken(token));
    res.setHeader("access-control-expose-headers", "authorization");
    res.status(codice).send(messaggio);
}

export { TipoServer, ReadFileAsync, OggettoVuoto, RispondiToken };