import dotenv from 'dotenv';

dotenv.config({path: '.env'});

const env = {
    ENCRYPTION_KEY : process.env.ENCRYPTION_KEY!,
    STR_CONN : process.env.MONGO_STR_CONN!,
    DB_NAME : process.env.DB_NAME!,
    PORT : +process.env.PORT!,
    DURATA_TOKEN : +process.env.DURATA_TOKEN_SERVER!,
    MAILUSER : process.env.MAIL_USER!,
    MAILPWD : process.env.MAIL_PWD!,
    EMAIL : process.env.EMAIL!,
    OAUTH_CREDENTIALS : process.env.OAUTH_CREDENTIALS!,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY!, 
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET!,
    TWILIO_API_SID: process.env.TWILIO_API_SID!,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY!,
    VONAGE_API_KEY: process.env.VONAGE_API_KEY!,
    VONAGE_API_SECRET: process.env.VONAGE_API_SECRET!
}

export default env;