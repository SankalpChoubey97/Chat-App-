import express from "express";
import { connectToMongoDB } from "./mongodb.js";
import {Server} from "socket.io";
import cors from "cors";
import http from 'http';
import { getDB } from "./mongodb.js";
import { ObjectId } from "mongodb";



const app=express();

//create server using http
const server=http.createServer(app);

//create socket server
const io=new Server(server,{
    cors:{
        origin:'*',
        methods:["GET","POST"]
    }
})

//use socket events
io.on('connection',(socket)=>{
    console.log("Connection is established");

    socket.on("checkUser", async (name, callback) => {
        const db = getDB();
        const userCollection = db.collection("users");

        try {
            const user = await userCollection.findOne({ name });
            callback(user !== null);
        } catch (error) {
            console.log("Error checking user:", error);
            callback(false);
        }
    });

    socket.on("join", async (userData) => {
        socket.username = userData.name;
        const db = getDB();
        const userCollection = db.collection("users");
        const onlineCollection = db.collection("online");
        const messageCollection = db.collection("messages"); // Fixed the collection name to "messages"
    
        try {
            // Add new user to the userCollection if type is 'new user'
            if (userData.type == 'new user') {
                await userCollection.updateOne(
                    { name: socket.username },
                    { $set: { name: socket.username } },
                    { upsert: true }
                );
            }
    
            // Add user to the online collection
            await onlineCollection.updateOne(
                { name: socket.username },
                { $set: { name: socket.username } },
                { upsert: true }
            );
    
            // Emit the updated online collection to the current client
            const onlineUsers = await onlineCollection.find().toArray();
            
            socket.emit('updateOnlineUsers', onlineUsers);
    
            // Broadcast the updated online collection to all other clients
            socket.broadcast.emit('updateOnlineUsers', onlineUsers);
    
            // Get messageCollection array and sort them according to timestamp, oldest being index 0 and newest being last index
            const oldMessages = await messageCollection.find().sort({ date: 1 }).toArray();
            socket.emit('load_old_messages', oldMessages);
            socket.broadcast.emit('user_joined',socket.username);
        } catch (error) {
            console.log("Error joining user:", error);
        }
    });
    

    socket.on('new_message', async(message)=>{
        console.log(message);

        const db = getDB();
        const messageCollection=db.collection("messages");
        
        try {
            // Add the message object to the message collection
            await messageCollection.insertOne(message);
            console.log("Message inserted into the database");
        } catch (error) {
            console.error("Error inserting message into the database:", error);
        }
    
        socket.broadcast.emit('broadcast_message',message);
    })

    socket.on('is_Typing',(is_typing)=>{
        console.log(is_typing);
        socket.broadcast.emit('typing',(is_typing));
    })

    

    socket.on('disconnect', async () => {
        try {
            const db = getDB();
            const onlineCollection = db.collection("online");
    
            // Remove the user from the online collection
            await onlineCollection.deleteOne({ name: socket.username });
    
            // Get the updated list of online users
            const onlineUsers = await onlineCollection.find().toArray();
    
            // Emit the updated online collection to all clients
            io.emit('updateOnlineUsers', onlineUsers);
            io.emit('userRemoved',socket.username);
    
            console.log("Connection is disconnected");
        } catch (error) {
            console.log("Error on disconnect:", error);
        }
    });    
})

server.listen(3000,()=>{
    console.log("Server is listening on port 3000");
    connectToMongoDB();
})
