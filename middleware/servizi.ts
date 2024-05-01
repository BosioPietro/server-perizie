import { Express, Request, Response } from "express";
import { MongoDriver } from "@bosio/mongodriver";
import { DecifraToken, ControllaAdmin } from "../encrypt.js";
import { CaricaImmagine, DataInStringa, StringaInData } from "../funzioni.js";
import { RispondiToken } from "../strumenti.js";
import { UploadApiResponse } from "cloudinary";
import env from "../ambiente.js";

const PrendiUtenti = (app: Express) => {
    app.get("/api/utenti", async (req: Request, res: Response) => {
        const filtri = req.query || {};
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const utenti = await driver.PrendiMolti(filtri);
        if(driver.Errore(utenti, res)) return;

        utenti.forEach((u: any) => { delete u["_id"] })

        RispondiToken(res, DecifraToken(req.headers.authorization!), utenti)
    })
}

const StatisticheAdmin = (app: Express) => {
    app.get("/api/statistiche-admin", async (req: Request, res: Response) => {
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driverPerizie = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");
        const driverUtenti = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        let [perizie, utenti] : [any, any] = await Promise.all([
            driverPerizie.PrendiMolti(),
            driverUtenti.PrendiMolti()
        ]);

        if(driverPerizie.Errore(perizie, res) || driverUtenti.Errore(utenti, res)) return;

        perizie = perizie.map((p: Record<string, any>) => Object.assign(p, { data: StringaInData(p["data"]) }));

        const statistiche = {
            perizie : perizie.length,
            utenti : utenti.length,
            perizieOggi : perizie.filter((p: Record<string, any>) => p["data"].getDate() == new Date().getDate()).length,
            utentiAttivi : utenti.filter((u: Record<string, any>) => u["attivo"] != "false").length
        }

        RispondiToken(res, token, statistiche)
    })
}

const PrendiPerizie = (app: Express) => {
    app.get("/api/perizie", async (req: Request, res: Response) => {
        const filtri = req.query || {};

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");

        const perizie = await driver.PrendiMolti(filtri);
        if(driver.Errore(perizie, res)) return;

        RispondiToken(res, DecifraToken(req.headers.authorization!), perizie)
    })
}

const EliminaUtenti = (app: Express) => {
    app.delete("/api/utenti", async (req: Request, res: Response) => {
        const { utenti } = req.body;
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const eliminati = await driver.Elimina({ username : { $in : utenti } });
        if(driver.Errore(eliminati, res)) return;

        RispondiToken(res, token, eliminati)
    })
}

const AggiornaUtente = (app: Express) => {
    app.patch("/api/aggiorna-utente", async (req: Request, res: Response) => {
        const utente = req.body;
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        delete utente["_id"];

        const aggiornato = await driver.Replace({ username : utente.username }, utente);
        if(driver.Errore(aggiornato, res)) return;

        RispondiToken(res, token, aggiornato)
    })
}

const CaricaImmagineProfilo = (app: Express) => {
    app.post("/api/carica-immagine-profilo", async (req: Request, res: Response) => {
        const { username } = req.body;
        const immagine: File = (req as any).files["immagine"];

        const token = DecifraToken(req.headers.authorization!)

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const utente = await driver.PrendiUno({ username });
        if(driver.Errore(utente, res)) return;

        let caricata = await CaricaImmagine(immagine);

        if(caricata["errore"]){
            res.status(500).send(caricata["errore"]);
            return;
        }
        else caricata = caricata as UploadApiResponse;

        utente["pfp"] = caricata["secure_url"];

        const aggiornato = await driver.Replace({ username }, utente);
        if(driver.Errore(aggiornato, res)) return;

        RispondiToken(res, token, {url : caricata["secure_url"]})
    })
}

const ResetImmagineProfilo = (app: Express) => {
    app.patch("/api/reset-immagine", async (req: Request, res: Response) => {
        const { username } = req.body;
        const token = DecifraToken(req.headers.authorization!);

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const utente = await driver.PrendiUno({ username });
        if(driver.Errore(utente, res)) return;

        utente["pfp"] = "";

        const aggiornato = await driver.Replace({ username }, utente);
        if(driver.Errore(aggiornato, res)) return;

        RispondiToken(res, token, aggiornato)
    })
}

const AggiungiUtente = (app: Express) => {
    app.post("/api/utenti", async (req: Request, res: Response) => {
        const utente = req.body;
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const aggiunto = await driver.Inserisci(utente);
        if(driver.Errore(aggiunto, res)) return;

        RispondiToken(res, token, aggiunto)
    })
}

const PrendiPerizia = (app: Express) => {
    app.get("/api/perizia/:idPerizia", async (req: Request, res: Response) => {
        const { idPerizia } = req["params"];

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");

        const perizia = await driver.PrendiUno({ codice : +idPerizia });
        if(driver.Errore(perizia, res)) return;

        RispondiToken(res, DecifraToken(req.headers.authorization!), perizia)
    })
}

const PrendiOperatore = (app: Express) => {
    app.get("/api/operatore/:codOperatore", async (req: Request, res: Response) => {
        const { codOperatore } = req["params"];

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const operatore = await driver.PrendiUno({ username : codOperatore });
        if(driver.Errore(operatore, res)) return;

        RispondiToken(res, DecifraToken(req.headers.authorization!), { nome : `${operatore["cognome"]} ${operatore["nome"]}` })
    })
}

const PrendiOperatori = (app: Express) => {
    app.get("/api/operatori", async (req: Request, res: Response) => {
        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");


        const operatori = await driver.PrendiMolti({ ruolo : { $in : [new RegExp("admin", "i"), new RegExp("dipendente", "i")]} });
        if(driver.Errore(operatori, res)) return;

        RispondiToken(res, DecifraToken(req.headers.authorization!), operatori)
    })

}

const EliminaPerizia = (app: Express) => {
    app.delete("/api/perizia/:idPerizia", async (req: Request, res: Response) => {
        const { idPerizia } = req["params"];
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");

        const eliminata = await driver.Elimina({ codice : +idPerizia });
        if(driver.Errore(eliminata, res)) return;

        RispondiToken(res, token, eliminata)
    })
}

const PrendiIndirizzi = (app: Express) => {
    app.get("/api/indirizzi", async (req: Request, res: Response) => {
        const { valore } = req.query;

        const richiesta = `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
                          `?input=${encodeURI(valore as string)}` +
                          `&locationbias=ipbias` +
                          `&language=it` +
                          `&types=geocode` +
                          `&key=${env["GOOGLE_PLACES_API_KEY"]}`;

        const risposta = await fetch(richiesta);
        const dati = await risposta.json();

        res.send(dati)
    })
}

const IndirizzoDaCoordinate = (app: Express) => {
    app.get("/api/geocode-coordinate", async (req: Request, res: Response) => {
        const { lat, lng } = req.query;

        const richiesta = `https://maps.googleapis.com/maps/api/geocode/json` +
                          `?latlng=${lat},${lng}` +
                          `&key=${env["GOOGLE_PLACES_API_KEY"]}`;

        const risposta = await fetch(richiesta);
        const dati = await risposta.json();

        res.send(dati)
    })
}

const ModificaPerizia = (app: Express) => {
    app.patch("/api/perizia", async (req: Request, res: Response) => {
        const perizia = req.body;
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");

        delete perizia["_id"];
        delete perizia["nomeOperatore"];

        const aggiornata = await driver.Replace({ codice : perizia.codice }, perizia);
        if(driver.Errore(aggiornata, res)) return;

        RispondiToken(res, token, aggiornata)
    })
}

const CaricaImmaginePerizia = (app: Express) => {
    app.post("/api/carica-immagine-perizia", async (req: Request, res: Response) => {
        const immagine: File = (req as any).files["immagine"];

        const caricata = await CaricaImmagine(immagine);

        if(caricata["errore"]){
            res.status(500).send(caricata["errore"]);
            return;
        }
        else res.send(caricata)
    })

}

const InfoUtente = (app: Express) => {
    app.get("/api/info-utente", async (req: Request, res: Response) => {
        const token = DecifraToken(req.headers.authorization!);

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        const utente = await driver.PrendiUno({ username : token["username"] });
        if(driver.Errore(utente, res)) return;

        RispondiToken(res, token, utente)
    });
}

const PerizieUtente = (app: Express) => {
    app.get("/api/perizie-utente", async (req: Request, res: Response) => {
        const { codOperatore } = req.query;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");

        const perizie = await driver.PrendiMolti({ codOperatore });
        if(driver.Errore(perizie, res)) return;

        RispondiToken(res, DecifraToken(req.headers.authorization!), perizie)
    });
}

const PrendiConfigGrafici = (app: Express) => {
    app.get("/api/configurazioni-grafici", async (req: Request, res: Response) => {
        const token = DecifraToken(req.headers.authorization!);

        if(!(await ControllaAdmin(token, res))) return;

        const driver = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "perizie");
        const driver1 = new MongoDriver(env["STR_CONN"], env["DB_NAME"], "utenti");

        let [perizie, utenti] : [any, any] = await Promise.all([
            driver.PrendiMolti(),
            driver1.PrendiMolti()
        ]);

        if(driver.Errore(perizie, res) || driver1.Errore(utenti, res)) return;

        perizie = perizie.map((p: Record<string, any>) => Object.assign(p, { data: StringaInData(p["data"]) }));
        perizie = perizie.filter((p: Record<string, any>) => (new Date().getTime() - p["data"].getTime()) < 40 * 24 * 60 * 60 * 1000);

        const settimane = [];
        for(let i = 0; i < 5; i++){
            const inizio = new Date(new Date().getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const fine = new Date(inizio.getTime() - 7 * 24 * 60 * 60 * 1000);


            const perizieSettimana = perizie.filter((p: Record<string, any>) => p["data"] >= fine && p["data"] <= inizio);

            const utentiPerizie = utenti.filter((u: Record<string, any>) => perizieSettimana.map((p: Record<string, any>) => p["codOperatore"]).includes(u["username"]));

            settimane.push({ data: DataInStringa(inizio), perizie : perizieSettimana, utenti : [...new Set(utentiPerizie)] });
        }

        RispondiToken(res, token, settimane)
    })

}

export { PrendiUtenti, EliminaUtenti, ControllaAdmin, AggiornaUtente, 
         CaricaImmagineProfilo, ResetImmagineProfilo, AggiungiUtente,
         PrendiPerizia, PrendiOperatore, EliminaPerizia, PrendiIndirizzi,
         IndirizzoDaCoordinate, ModificaPerizia, CaricaImmaginePerizia,
         PrendiOperatori, PrendiPerizie, InfoUtente, StatisticheAdmin,
         PerizieUtente, PrendiConfigGrafici};