import _cloudinary, { UploadApiResponse } from "cloudinary";
import env from "./ambiente.js";

const Cloudinary = _cloudinary.v2;

Cloudinary.config({
    cloud_name: env["CLOUDINARY_CLOUD_NAME"],
    api_key: env["CLOUDINARY_API_KEY"],
    api_secret: env["CLOUDINARY_API_SECRET"]
})

const CaricaImmagine = (image: any) => {
    return new Promise<{errore: string} | UploadApiResponse>((resolve) => {
        Cloudinary.uploader.upload(image.path, (error: any, result: any) => {
            console.log(error, result)
            if(error) resolve({errore : "Errore nel caricamento dell'immagine"});
            resolve(result!);
        })  
    });
}

const CaricaImmagineBase64 = (image: string) => {
    return new Promise<{errore: string} | UploadApiResponse>((resolve) => {
        Cloudinary.uploader.upload(image, (error: any, result: any) => {
            console.log(error, result)
            if(error) resolve({errore : "Errore nel caricamento dell'immagine"});
            resolve(result!);
        })  
    });
}

const DataInStringa = (data: Date, tempo = false) => {
    const giorno = data.getDate().toString().padStart(2, "0")
    const mese = (data.getMonth() + 1).toString().padStart(2, "0")
    const anno = data.getFullYear();
    if(tempo){
        const ora = data.getHours().toString().padStart(2, "0")
        const minuti = data.getMinutes().toString().padStart(2, "0")
        return `${anno}-${mese}-${giorno}/${ora}:${minuti}`
    }
    return `${anno}-${mese}-${giorno}`
}

const StringaInData = (data: string) => {
    const [dataStringa, oraStringa] = data.split("/");
    const [anno, mese, giorno] = dataStringa.split("-").map(Number);
    if(oraStringa){
        const [ora, minuti] = oraStringa.split(":").map(Number);
        return new Date(anno, mese - 1, giorno, ora, minuti);
    }
    return new Date(anno, mese - 1, giorno);
}

export { DataInStringa, StringaInData, CaricaImmagine, CaricaImmagineBase64 }