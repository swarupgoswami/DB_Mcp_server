import Database, {Database as DatabaseType} from "better-sqlite3";
import path from "path";;


let db:DatabaseType

export function connectSqlite(){
    if(!db){

        const absPath = path.resolve("C:/Users/goswa/OneDrive/Desktop/DB_mcp/mydb.sqlite");
        db= new Database(absPath);
        // console.log(`connected to thesqlite database ${dbPath}`);
    }
    return db;
}
