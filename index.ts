import https from "https";
import { MongoDriver } from "@bosio/mongodriver";
import express, { Express } from "express";
import env from "./ambiente.js";
import { ReadFileAsync } from "./strumenti.js";

import * as Richieste from "./middleware/base.js";
import * as Cors from "./middleware/cors.js";
import * as Errori from "./middleware/errori.js";
import * as Autenticazione from "./middleware/autenticazione.js";
import * as Servizi from "./middleware/servizi.js";

// APERTURA SERVER
const app : Express = express();

const [cert, key] = await Promise.all([
    ReadFileAsync("./keys/certificate.crt"),
    ReadFileAsync("./keys/private_key.pem")
]);


const server = https.createServer({key, cert}, app);

server.listen(env["PORTA"], () => console.log("Server Avviato"));


/* MIDDLEWARE */

// gestione delle richieste
Richieste.LoggingRichieste(app);
Richieste.MiddlewareJson(app);
Richieste.MiddlewareBodyParser(app);
Richieste.MiddlewareLogParametri(app);
Richieste.MiddlewareFormData(app);

// gestione cors
Cors.MiddlewareCors(app);

// gestione autenticazione
Autenticazione.RegistraUtente(app);
Autenticazione.LoginUtente(app);
Autenticazione.LoginOAuth(app);
Autenticazione.LogoutUtente(app);
Autenticazione.CambiaPassword(app);
Autenticazione.RecuperoCredenziali(app);
Autenticazione.VerificaCodice(app);
Autenticazione.ControllaUsername(app);
Autenticazione.ControlloToken(app);
Autenticazione.ControlloTokenMiddleware(app);
Autenticazione.VerificaRecupero(app);
Autenticazione.InviaCodiceTelefono(app);
Autenticazione.VerificaCodiceTelefono(app);

// gestione servizi
Servizi.PrendiUtenti(app);
Servizi.EliminaUtenti(app);
Servizi.AggiornaUtente(app);
Servizi.CaricaImmagineProfilo(app);
Servizi.ResetImmagineProfilo(app);
Servizi.AggiungiUtente(app);
Servizi.PrendiPerizia(app);
Servizi.PrendiOperatore(app);
Servizi.EliminaPerizia(app);
Servizi.PrendiIndirizzi(app);
Servizi.IndirizzoDaCoordinate(app);
Servizi.ModificaPerizia(app);
Servizi.CaricaImmaginePerizia(app);
Servizi.PrendiOperatori(app);
Servizi.PrendiPerizie(app);
Servizi.InfoUtente(app);
Servizi.StatisticheAdmin(app);
Servizi.PerizieUtente(app);
Servizi.PrendiConfigGrafici(app);

// gestione errori
Errori.LoggingErrori(app);
Errori.GestioneErrori(app);

