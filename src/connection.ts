import {WebSocket} from "ws";
import {IncomingMessage} from "http"
import {Server} from "./server";
import {deserialize_message, serialize_message} from "./message";
import type {Message} from "./message"
import {ControlMessage} from "./controlMessage";


export enum ConnectionMode {
    plaintext, json,
}


export class Connection {
    static next_connection_id = 0
    id: number
    secure: boolean
    mode: ConnectionMode
    username?: string
    socket: WebSocket
    parent_server: Server

    private constructor(socket: WebSocket, secure: boolean, server: Server, id: number) {
        this.secure = secure;
        this.mode = ConnectionMode.plaintext;
        this.id = id;
        this.socket = socket;
        this.parent_server = server;
    }

    public handle_message(data: Buffer) {
        let str = data.toString("utf8")
        let msg = deserialize_message(this.mode, str, this.secure, this.username ?? `unknown(${this.id})`)

        if (msg.msg_type == "chat") {
            console.log(`${msg.msg_type} - ${msg.payload.serialize(ConnectionMode.plaintext, this.id)}`)
            this.parent_server.broadcast_except(msg, this.id)
            return
        }

        if (msg.msg_type == "control") {
            msg.payload.run(this, this.parent_server)
        }

    }

    /**
     * creates a new connection
     * @param socket websocket
     * @param request originating http(s) request
     * @param secure is this a wss:// connection
     * @param server parent server
     */
    public static init_connection(socket: WebSocket, request: IncomingMessage, secure: boolean, server: Server) {
        let id = Connection.next_connection_id
        Connection.next_connection_id += 1;

        if (secure) {
            console.log(`secure ws server accepting connection ${id}`)
        } else {
            console.log(`insecure ws server accepting connection ${id}`)
        }

        let connection = new Connection(socket, secure, server, id)

        server.connections.set(id, connection)
        server.usernames.set(id, `unknown(${id})`)

        socket.addListener("message", (data: Buffer) => {
            try {
                connection.handle_message(data)
            } catch (e: any) {
                try {
                    let err: Message = {
                        msg_type: "control",
                        payload: new ControlMessage(connection.secure, "error", [e.toString()], "[SERVER]")
                    }
                    connection.send(err)
                } catch {

                }
            }
        })

        socket.addListener("close", () => {
            server.usernames.delete(connection.id)
            let name = connection.username ?? `unknown(${connection.id})`
            let leave: Message = {
                msg_type: "control", payload: new ControlMessage(connection.secure, "userleave", [name], "[SERVER]")
            }
            server.broadcast_except(leave, connection.id)
            server.connections.delete(connection.id)
        })

        let msg: Message = {
            msg_type: "control", payload: new ControlMessage(connection.secure, "status", ["ready"], "[SERVER]")
        }
        connection.send(msg)

    }

    /**
     * sends a message on this connection
     */
    public send(msg: Message) {
        let serial_msg = serialize_message(msg, this.mode, this.id)
        this.socket.send(serial_msg)
    }


}