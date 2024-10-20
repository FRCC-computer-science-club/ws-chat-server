import {Server as WsServer, ServerOptions, WebSocket} from "ws"
import {IncomingMessage} from "http"
import {createServer as createHttpsServer} from "https"
import {readFileSync, createWriteStream, WriteStream} from 'fs';

import {Connection} from "./connection";
import {Message} from "./message";

type ServerSettings = ServerOptions<typeof WebSocket.WebSocket, typeof IncomingMessage>

const SECURE_WSS_PORT = 8443
const INSECURE_WSS_PORT = 8080

export class Server {
    wss_insecure: WsServer;
    wss_secure: WsServer;
    connections: Map<Number, Connection>;
    usernames: Map<Number, string>;
    log_handle: WriteStream;

    constructor() {

        let now = Date.now()
        this.log_handle = createWriteStream(`./log/log_${now}.txt`, {flags: "a"})

        let settings: ServerSettings = {
            port: INSECURE_WSS_PORT
        }

        this.wss_insecure = new WsServer(settings)

        this.connections = new Map<Number, Connection>()

        this.wss_insecure.addListener("close", () => {
            this.log("insecure ws server closed")
        })
        this.wss_insecure.addListener("listening", () => {
            this.log(`insecure ws server listening on port ${INSECURE_WSS_PORT}`)
        })

        let parent_server = this;
        this.wss_insecure.addListener("connection", (socket: WebSocket, request: IncomingMessage) => {
            Connection.init_connection(socket, request, false, parent_server)
        })

        const https_server = createHttpsServer({
            cert: readFileSync('./certs/cert.pem'), key: readFileSync('./certs/key.pem')
        });

        let secure_settings: ServerSettings = {
            server: https_server
        }

        this.wss_secure = new WsServer(secure_settings)
        this.wss_secure.addListener("close", () => {
            this.log("secure ws server closed")
        })
        this.wss_secure.addListener("listening", () => {
            this.log(`secure ws server listening on port ${SECURE_WSS_PORT}`)
        })
        this.wss_secure.addListener("connection", (socket: WebSocket, request: IncomingMessage) => {
            Connection.init_connection(socket, request, true, parent_server)
        })

        https_server.listen(SECURE_WSS_PORT)

        this.usernames = new Map<Number, string>()

    }

    log(msg: string) {
        console.log(msg)
        function escape(str: string) {
            let new_str = ""
            let code, i, len;

            for (i = 0, len = str.length; i < len; i++) {
                code = str.charCodeAt(i);
                if (
                    (code > 96 && code < 123) ||    // lower alpha (a-z)
                    (code == 32) ||                 // space
                    (code > 64 && code < 91) ||     // upper alpha (A-Z)
                    (code > 47 && code < 58) ||     // numeric (0-9)
                    (code == 33) ||                 // !
                    (code == 35) ||                 // #
                    (code == 45) ||                 // -
                    (code == 95) ||                 // _
                    (code == 58) ||                 // :
                    (code == 91) ||                 // [
                    (code == 93)                    // ]
                ) {
                    new_str = new_str + str.charAt(i)
                } else {
                    // i put the code point in a non-unicode format to prevent terminals from converting it back to characters
                    new_str = `${new_str}[${code}]`
                }
            }
            return new_str
        }

        let timestamp = Date.now()

        this.log_handle.write(`${timestamp} ${escape(msg)}\n`)
    }

    broadcast(msg: Message) {
        this.connections.forEach((connection) => {
            connection.send(msg)
        })
    }

    broadcast_except(msg: Message, excluded_id: number) {
        this.connections.forEach((connection) => {
            if (connection.id != excluded_id) {
                connection.send(msg)
            }
        })
    }

}
