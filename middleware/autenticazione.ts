import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import { MongoDriver } from "@bosio/mongodriver";
import { ConfrontaPwd, ControllaToken, GeneraPassword, GeneraCodice, CifraPwd, DecifraToken } from "../encrypt.js";
import { InviaMailNuovaPassword, InviaMailPasswordCambiata, InviaMailRecupero } from "./mail.js";
import { RispondiToken } from "../strumenti.js";
import { DataInStringa, StringaInData } from "../funzioni.js";
import env from "../ambiente.js"

const RegistraUtente = async (app : Express) => {
    app.post("/api/registrazione", async (req : Request, res : Response) => {
        const { username, email } = req["body"];
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const [userUtente, userEmail] = await Promise.all([
            driver.PrendiUno({ username }), 
            driver.PrendiUno({ email })
        ])
        if(driver.Errore(userUtente, res) || driver.Errore(userEmail, res)) return;

        if(userUtente) return res.status(400).send("Username già esistente")
        if(userEmail) return res.status(400).send("Email già registrata")
    
        const password = GeneraPassword()
        const d = new Date();
        const inserimento = await driver.Inserisci({ 
            username, 
            email, 
            password : CifraPwd(password), 
            cambioPwd : true, 
            dataCreazione: `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`
        })
        if(driver.Errore(inserimento, res)) return;

        const dataToken = {username, _id : inserimento["insertedId"].toString()}
        
        InviaMailNuovaPassword(username, password, email)
        .then(() => RispondiToken(res, dataToken, { "ok" : "Registrazione effettuata" }))
        .catch(() => res.status(500).send("Errore nell'invio della mail"))
    })
}

const LoginUtente = async (app : Express) => {
    app.post("/api/login", async (req : Request, res : Response) => {
        const { username: utente, password } = req["body"];
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        
        const tipo = utente.includes("@") ? "email" : "username";
        const user = await driver.PrendiUno({ [tipo] : utente })
    
        if(driver.Errore(user, res)) return;
        if(!user) return res.status(400).send("Username non esistente") 

        console.log(password, user["password"])

        console.log(user)
        console.log(ConfrontaPwd(password, user["password"]))
        console.log(user["password"])
    
        if(ConfrontaPwd(password, user["password"]))
        {
            const dataToken: any = { 
                username: user["username"], 
                _id : user["_id"].toString(), 
                assuntoIl : user["assuntoIl"],
                deveCambiare : user["cambioPwd"] 
            }

            if(user["ruolo"] == "Admin" || user["2FA"]){
                dataToken["2FA"] = false;   
            }

            const risposta: Record<string, any> = { "deveCambiare" : user["cambioPwd"] }
            if(user["ruolo"] == "Admin" || user["2FA"])
            {
                risposta["2FA"] = false;   
            }

            console.log("Utente loggato")

            RispondiToken(res, dataToken, risposta)
        }
        else return res.status(401).send("Password errata");
    });   
}


const LoginOAuth = async (app : Express) => {
    app.post("/api/login-oauth", async (req : Request, res : Response) => {
        const { email } = req["body"];
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        
        const regex = new RegExp(`^${email}$`, "i");

        const user = await driver.PrendiUno({ email : regex });

        if(driver.Errore(user, res)) return;
        if(!user) return res.status(400).send("Utente non autorizzato");

        const dataToken: any = { 
            username: user["username"], 
            _id : user["_id"].toString(), 
            assuntoIl : user["assuntoIl"],
            deveCambiare : user["cambioPwd"] 
        }
        
        if(user["ruolo"] == "Admin" || user["2FA"]){
            dataToken["2FA"] = !false;   
        }

        const risposta: Record<string, any> = { "deveCambiare" : user["cambioPwd"] }
        if(user["ruolo"] == "Admin" || user["2FA"])
        {
            risposta["2FA"] = !false;   
        }

        RispondiToken(res, dataToken, risposta)
    });
}

const CambiaPassword = (app: Express) => {
    app.post("/api/cambio-password", async (req : Request, res : Response) => {
        const { password } = req["body"];
        const payload = DecifraToken(req.headers["authorization"]!);
        const { username } = payload;
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const user : any = await driver.PrendiUno({ username })
        if(driver.Errore(user, res)) return;

        delete user["_id"];
        // se il cambio delle password iniziale
        delete user["cambioPwd"]
        // se il cambio password è un recupero
        delete user["recupero"]

        user["password"] = CifraPwd(password);

        const data = await driver.Replace({ username }, user)
        if(driver.Errore(data, res)) return;

        delete payload["deveCambiare"]

        InviaMailPasswordCambiata(user["username"], user["email"])
        .then(() => RispondiToken(res, payload, { "ok" : "Password Cambiata" }))
        .catch(() => RispondiToken(res, payload, `Errore nell'invio della mail`, 500))
    })
}

const RecuperoCredenziali = (app: Express) =>{
    app.post("/api/recupero-credenziali", async (req: Request, res: Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        const { email } = req["body"];
        
        const user = await driver.PrendiUno({ email });
        if(driver.Errore(user, res)) return;
        
        
        const dataToken: any = { username: user["username"], _id : user["_id"].toString() }
        if(user["ruolo"] == "Admin" || user["2FA"]){
            dataToken["2FA"] = false;   
        }

        if(!user) return RispondiToken(res, dataToken, `User non esistente`, 400)
        delete user["_id"];

        const codice = GeneraCodice();
        const recupero = {
            data: DataInStringa(new Date(), true),
            codice
        }

        const data = await driver.Replace({ email }, { ...user, recupero })
        console.log(data)
        if(driver.Errore(data, res)) return;

        InviaMailRecupero(email, user["username"], codice)
        .then(() => RispondiToken(res, dataToken, { "ok" : "Email inviata" }))
        .catch(() => RispondiToken(res, dataToken, `Errore nell'invio della mail`, 500))
    })
}

const VerificaRecupero = (app: Express) => {
    app.get("/api/verifica-recupero", async (req: Request, res: Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        const payload = DecifraToken(req.headers["authorization"]!)
        const { username } = payload;

        const user = await driver.PrendiUno({ username });
        if(driver.Errore(user, res)) return;

        if(!user["recupero"])
        {
            RispondiToken(res, payload, `L'utente non deve cambiare la password`, 400)
        }
        else RispondiToken(res, payload, { ris : "ok"})
    })
}

const VerificaCodice = (app: Express) => {
    app.post("/api/verifica-codice", async (req: Request, res: Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        const payload = DecifraToken(req.headers["authorization"]!);
        const { username } = payload;
        const { codice } = req["body"]

        console.log(username, codice)
        const user = await driver.PrendiUno({ username });
        if(driver.Errore(user, res)) return;

        if(!user) return RispondiToken(res, payload, `Utente non esistente`, 400)

        if(!user["recupero"]) return RispondiToken(res, payload, `Recupero non richiesto`, 400)

        const { recupero } = user;
        const oggi = new Date();
        const dataRichiesta = StringaInData(recupero["data"])

        if((oggi.getTime() - dataRichiesta.getTime()) > 60 * 30 * 1000){
            delete user["recupero"]
            delete user["_id"]
            
            const info = await driver.Replace({ username }, user)
            if(driver.Errore(info, res)) return;
            RispondiToken(res, payload, `Tempo scaduto`, 410)
            return;
        }

        if(codice !== recupero["codice"]){
            RispondiToken(res, payload, `Codice errato`, 411)
            return;
        }

        RispondiToken(res, payload, { ris : "ok"})
    })
}

const InviaCodiceTelefono = (app: Express) => {
    app.post("/api/invia-codice-verifica", async (req: Request, res: Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        const payload = DecifraToken(req.headers["authorization"]!);
        const { username } = payload;

        const user = await driver.PrendiUno({ username });
        if(driver.Errore(user, res)) return;

        if(!user) return RispondiToken(res, payload, `Utente non esistente`, 400)
        
        if(user["ruolo"] != "Admin" && !user["2FA"]){
            RispondiToken(res, payload, `La verifica telefonica è disabilitata per questo utente`, 401)
            return;
        }  

        if(!user["telefono"]){
            RispondiToken(res, payload, `Numero di telefono non fornito`, 401)
            return;
        }

        const url = `https://verify.twilio.com/v2/Services/VA9774fb566b94ad1bccbb6f7a7ae94698/Verifications`;
        const options = {
            method: 'POST',
            headers: {
                Authorization: `Basic ${btoa(env["TWILIO_API_SID"] + ':' + env["TWILIO_API_SECRET"])}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                To: '+39' + user["telefono"],
                Channel: 'sms'
            })
        };

        fetch(url, options)
        .then((response) => response.json())
        .then(async (verification) => {
            user["recupero"] = {
                data: verification["date_created"],
                sid: verification["sid"]
            }
            
            const data = await driver.Replace({ username }, user)
            if(driver.Errore(data, res)) return;
    
            RispondiToken(res, payload, { ris : "ok"})
        })
        .catch(() => RispondiToken(res, payload, `Errore nell'invio del codice`, 500))
    })
}

const VerificaCodiceTelefono = (app: Express) => {
    app.post("/api/verifica-codice-telefono", async (req: Request, res: Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        const payload = DecifraToken(req.headers["authorization"]!);
        const { username } = payload;
        const { codice } = req["body"];


        const user = await driver.PrendiUno({ username });
        if(driver.Errore(user, res)) return;

        if(!user) return RispondiToken(res, payload, "Utente non esiste", 400);

        if(!user["recupero"]){
            RispondiToken(res, payload, "Utente non ha richiesto la verifica", 400);
            return;
        }

        const url = `https://verify.twilio.com/v2/Services/VA9774fb566b94ad1bccbb6f7a7ae94698/VerificationCheck`;

        const options = {
        method: 'POST',
        headers: {
            Authorization: `Basic ${btoa(env["TWILIO_API_SID"] + ':' + env["TWILIO_API_SECRET"])}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            To: '+39' + user["telefono"],
            Code: codice
        })
        };

        fetch(url, options)
        .then(response => response.json())
        .then(verification_check => {
            console.log(verification_check)
            if(verification_check.status == "approved")
            {
                delete user["recupero"]
                delete user["_id"]
                payload["2FA"] = true;
            
                driver.Replace({ username }, user)
                .then(() => RispondiToken(res, payload, { ris : "ok"}))
                .catch(() => RispondiToken(res, payload, "Errore nel salvataggio", 500))
            }
            else RispondiToken(res, payload, "Codice errato", 401)
        })
        .catch(() => RispondiToken(res, payload, "Errore nella verifica", 500));
    })
}

const ControllaUsername = async (app: Express) => {
    app.get("/api/controlla-username", async (req : Request, res : Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");
        const { username } = req.query;

        const user = await driver.PrendiUno({ username });
        if(driver.Errore(user, res)) return;

        if(user) return res.status(400).send("Username già esistente")
        res.send({ "ok" : "Username disponibile" })
    })
}


const LogoutUtente = (app : Express) => {
    app.get("/api/logout", (req : Request, res : Response) => {
        res.send({ "ok" : "Logout effettuato" })
    });
}

const ControlloToken = (app : Express) => {
    app.get("/api/controllo-token", (req : Request, res : Response) => ControllaToken(req, res));
}

const ControlloTokenMiddleware = (app : Express) => {
    app.use("/api/", (req : Request, res : Response, next : NextFunction) => ControllaToken(req, res, next));
}

export { 
    RegistraUtente, LoginUtente, LogoutUtente, ControlloToken, ControlloTokenMiddleware, 
    LoginOAuth, CambiaPassword, RecuperoCredenziali, VerificaCodice, 
    VerificaRecupero, InviaCodiceTelefono, VerificaCodiceTelefono, ControllaUsername
}