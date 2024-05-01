import bcrypt from 'bcryptjs';
import env from './ambiente.js';
import jwt from 'jsonwebtoken';
import { VerifyErrors } from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { MongoDriver } from '@bosio/mongodriver';

const CifraPwd = (password: string): string => bcrypt.hashSync(password, 10);

const ConfrontaPwd = (password: string, hash: string) : boolean => bcrypt.compareSync(password, hash);

const CreaToken = (utente : {username : string, _id? : string, iat? : number, "2FA"?: boolean}) : string => {
    const secondi = Math.floor(new Date().getTime() / 1000);
    const durata = env["DURATA_TOKEN"];
    
    let payload: Record<string, any> = {
        iat : utente["iat"] || secondi,
        exp : secondi + durata,
        username : utente["username"],
        _id : utente["_id"],
    }

    if(utente["2FA"] != undefined)
    {
        payload["2FA"] = utente["2FA"];   
    }
    
    return jwt.sign(payload, env["ENCRYPTION_KEY"]);
}

const ControllaToken = (req : Request, res : Response, next? : NextFunction) => {
    if(!req.headers["authorization"]) return res.status(403).send("Token non fornito");
    
    const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
    const token = req.headers["authorization"];

    jwt.verify(token, env["ENCRYPTION_KEY"], async (err : VerifyErrors | null, payload : any) => {
        if(err) return res.status(500).send("Errore nella verifica del token: " + err["message"]);

        const token = CreaToken(payload);

        res.setHeader("authorization", token)
        res.setHeader("access-control-expose-headers", "authorization")
        Object.assign(req, { payload })
        
        if(!next)
        {
            const tipo = payload["username"].includes("@") ? "email" : "username";
            const utente = await driver.PrendiUno({ [tipo] : payload["username"] }, { cambioPwd : 1, dataCreazione : 1 })
            if(!driver.Errore(utente))
            {
                res.send(payload)
            }
            else res.status(500).send("Errore durante la convalida dell'utente")
        }
        else next();
    })
}

type Token = { username : string, _id? : string, iat? : number, "2FA"?: boolean }
const DecifraToken = (token : string) => jwt.decode(token) as Token;

const GeneraPassword = () : string => {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numeri = "0123456789";
    const speciali = "!@#$%^&*()_+";

    const c = alfabeto + alfabeto.toLowerCase() + numeri + speciali;
    const Carattere = () => c.charAt(Math.floor(Math.random() * c.length))
    
    return new Array(14).fill('').reduce((acc) => acc + Carattere(), "");
}

const GeneraCodice = () => {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numeri = "0123456789";
    const c = alfabeto + numeri;

    const Carattere = () => c.charAt(Math.floor(Math.random() * c.length))

    return new Array(6).fill('').reduce((acc) => acc + Carattere(), "");
}

const ControllaAdmin = async (u: Token, res: Response) : Promise<boolean | null> => {
    const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

    const admin = await driver.PrendiUno({ username: u.username });
    if(driver.Errore(admin, res)) return false;

    if(admin.ruolo.toLowerCase() != "admin"){
        res.status(405).send("Non hai i permessi per effettuare questa operazione");
        return false;
    }

    return true;
}

export { ConfrontaPwd, CreaToken, ControllaToken, GeneraPassword, GeneraCodice, CifraPwd, DecifraToken, Token, ControllaAdmin }