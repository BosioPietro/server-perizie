import nodemailer, { TransportOptions } from 'nodemailer';
import env from '../ambiente.js';
import { google } from 'googleapis';  
import { ReadFileAsync } from '../strumenti.js';

type MailOptions = {
    from: string,
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{filename: string, path: string}>
}

//#region AUTENTICAZIONE

const OAuth2 = google.auth.OAuth2;
const o_Auth2 = JSON.parse(env.OAUTH_CREDENTIALS!)

const OAuth2Client = new OAuth2(
    o_Auth2["client_id"],
    o_Auth2["client_secret"]
);

OAuth2Client.setCredentials({
    refresh_token: o_Auth2.refresh_token,
});

const AccessToken = async () => {
    const accessToken = await OAuth2Client.getAccessToken().catch(() => null);
    if(!accessToken) return;

    return {
        "type": "OAuth2",
        "user": env["EMAIL"],
        "clientId": o_Auth2.client_id,
        "clientSecret": o_Auth2.client_secret,
        "refreshToken": o_Auth2.refresh_token,
        "accessToken": accessToken
    }
}

//#endregion

const [nuovaPassword, passwordCambiata, recuperoCredenziali] = await Promise.all([
    ReadFileAsync("./mail/nuovaPassword.html"), 
    ReadFileAsync("./mail/passwordCambiata.html"),
    ReadFileAsync("./mail/recuperoCredenziali.html")
]);

const InviaMail = (opzioni : MailOptions) => new Promise<string>(async (resolve, reject) => {
    const auth = await AccessToken();
    if(!auth) reject("Errore richiesta token");

    const transporter = nodemailer.createTransport({
        service : "gmail",
        auth : auth
    } as TransportOptions);
    transporter.sendMail(opzioni, (err : Error | null) => {
        if (err)
        {
            reject(err);
        }
        else resolve("Mail inviata");
    })
});

const InviaMailNuovaPassword = (username : string, password : string, email : string) => {

    const opzioni : MailOptions = {
        from: env["EMAIL"],
        to: email,
        subject: "Registrazione effettuata",
        html: nuovaPassword.replace("${username}", username).replace("${password}", password)
    }
    return InviaMail(opzioni);
}

const InviaMailPasswordCambiata = (username : string, email : string) => {
    const opzioni : MailOptions = {
        from: env["EMAIL"],
        to: email,
        subject: "Cambiamento Password",
        html: passwordCambiata.replace("${username}", username)
    }
    return InviaMail(opzioni);
}

const InviaMailRecupero = (email: string, username: string, codice: string) =>{
    const opzioni: MailOptions = {
        from: env["EMAIL"],
        to: email,
        subject: "Recupero Credenziali",
        html: recuperoCredenziali.replace("${username}", username).replace("${codice}", codice)
    }
    return InviaMail(opzioni);
}

export { InviaMailNuovaPassword, InviaMailPasswordCambiata, InviaMailRecupero }