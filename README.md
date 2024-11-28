README.md
This file contains instructions on how to set up and run the application.

## Requirements

- Node.js 
- MongoDB 

## Installation Steps

Clone the repository

Install dependencies: npm install  

Ensure MongoDB is running. If you're using a local MongoDB instance, ensure that it is started on the default port (27017). 

The app creates the following in MongoDb:
Database name : game
Collection name : Character

Place character JSON files into the characters folder. Each character file should be named CharacterName.json (e.g., Briv.json).

Start the server: npm start  

The server will read the JSON files in the characters folder and insert the character data into MongoDB if the character is not already present in the database.

API Endpoints can be found in postman/postman_collection.json