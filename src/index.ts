import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

if (!process.env.MONGODB_URI) {
  dotenv.config();
}

const uri = process.env.MONGODB_URI!;
const dbname = process.env.MONGODB_DB!;
const collectionName = process.env.MONGODB_COLLECTION!;
const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbname);
const collection = db.collection(collectionName);

const server = new Server(
  {
    name: "mongo-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_document",
        description: "create a document in mongoDB collecion",
        inputSchema: {
          type: "object",
          properties: {
            doc: {
              type: "object",
              description: "Document to insert",
            },
          },
          required: ["doc"],
        },
      },
      {
        name: "read_document",
        description:
          "Read documents from MongoDB collection using a query filter",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "object",
              description:
                "MongoDB query filter (leave empty to fetch all documents)",
            },
          },
          required: [], // filter is optional
        },
      },
      {
        name: "update_document",
        description: "Update documents in MongoDB collection using a filter",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "object",
              description: "MongoDB query filter to select documents to update",
            },
            update: {
              type: "object",
              description: "MongoDB update object (e.g., { $set: { field: value } })",
            },
          },
          required: ["filter", "update"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "create_document") {
    if (!args || typeof args !== "object" || !("doc" in args)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Missing or invalid arguments for create_document"
      );
    }

    const { doc } = args as { doc: Record<string, any> };

    try {
      const result = await collection.insertOne(doc as Record<string, any>);
      return {
        toolResult: { insertedId: result.insertedId.toString() },
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, "mongo db insert failed")
    }
  }

  


  if(name ==='read_document'){
    if(!args || typeof args !=='object'){
        throw new McpError(
          ErrorCode.InvalidRequest,'invalid arguments for read_document')
    }

    const {filter}= args as { filter?: Record<string, any> };

    try{
       const docs=await collection.find(filter || {}).toArray();

      //  console.error("Read result:", docs);


       return{
        content: [
        {
          type: "text",
          text: JSON.stringify(docs, null, 2)
        }
      ]
       };
    }catch(error){
       throw new McpError(
         ErrorCode.InternalError,'mongodb read failed');
    }
  }


  if(name === "update_document"){
    if(!args || typeof args != "object" || !("filter" in args) || !("update" in args)){
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Missing or invalid arguments for update_document"
      );
    }


    const {filter,update}= args as {filter:Record<string, any>, update: Record<string, any>};

    try{

      const result =await collection.updateMany(filter,update);

      return{
         toolResult: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
      };

    }catch(error){

      throw new McpError(ErrorCode.InternalError,"mongodb update failed");

    }
  }


  throw new McpError(ErrorCode.InvalidRequest, "tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
