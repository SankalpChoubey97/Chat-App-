import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const url=process.env.DB_URL;
console.log("URL: "+url);

let client;
export const connectToMongoDB = ()=>{
    MongoClient.connect(url)
        .then(clientInstance=>{
            client=clientInstance
            console.log("Mongodb is connected");
        })
    .catch(err=>{
        console.log(err);
    })
}

export const getDB=()=>{
    return client.db();
}
