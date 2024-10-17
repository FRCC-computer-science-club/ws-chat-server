import {Server as WsServer, ServerOptions, WebSocket} from "ws"
import {IncomingMessage} from "http"
import {createServer as createHttpsServer} from "https"
import {readFileSync} from 'fs';

import {Connection} from "./connection"
import {ChatMessage} from "./chatMessage";
import {ControlMessage} from "./controlMessage";
import {Message} from "./message";

type ServerSettings = ServerOptions<typeof WebSocket.WebSocket, typeof IncomingMessage>

const SECURE_WSS_PORT = 8443
const INSECURE_WSS_PORT = 8080

export class Server {
    wss_insecure: WsServer;
    wss_secure: WsServer;
    connections: Map<Number, Connection>;
    usernames: Map<Number,string>;

    constructor() {
        let settings: ServerSettings = {
            port: INSECURE_WSS_PORT
        }

        this.wss_insecure = new WsServer(settings)

        this.connections = new Map<Number, Connection>()

        this.wss_insecure.addListener("close", () => {
            console.log("insecure ws server closed")
        })
        this.wss_insecure.addListener("listening", () => {
            console.log(`insecure ws server listening on ${INSECURE_WSS_PORT}`)
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
            console.log("secure ws server closed")
        })
        this.wss_secure.addListener("listening", () => {
            console.log(`secure ws server listening on ${SECURE_WSS_PORT}`)
        })
        this.wss_secure.addListener("connection", (socket: WebSocket, request: IncomingMessage) => {
            Connection.init_connection(socket, request, true, parent_server)
        })

        https_server.listen(SECURE_WSS_PORT)

        this.usernames = new Map<Number, string>()
    }

    broadcast(msg: Message) {
        this.connections.forEach((connection) => {
            connection.send(msg)
        })
    }

    broadcast_except(msg: Message, excluded_id: number) {
        this.connections.forEach((connection) => {
            if(connection.id != excluded_id) {
                connection.send(msg)
            }
        })
    }

}
