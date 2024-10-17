import {Connection, ConnectionMode} from "./connection";
import {Server} from "./server";
import {Message} from "./message";


export const SERVER_CTRL_CHAR = '@'
export const PUB_CTRL_CHAR = '&'

interface Command_Raw {
    control: String;
    params: String[];
    author: String;
}

export class ControlMessage {
    author?: String;
    control: String;
    secure: boolean;
    params: String[];
    idempotency: number | null

    constructor(secure: boolean, control: String, params: String[], author?: string, idempotency?: number) {
        this.author = author;
        this.control = control
        this.secure = secure
        this.params = params
        this.idempotency = idempotency ?? null
    }

    serialize(mode: ConnectionMode, connection_id: number): String {
        switch (mode) {
            case ConnectionMode.plaintext:
                return `${SERVER_CTRL_CHAR} ${this.author ?? `unknown(${connection_id})`} ${this.control} ${this.params.join(",")}`
            case ConnectionMode.json:
                let raw: Command_Raw = {
                    control: this.control, params: this.params, author: this.author ?? `unknown(${connection_id})`
                }
                return JSON.stringify(raw)
        }
    }

    run(connection: Connection, server: Server) {
        switch (this.control) {
            case("setusername"):
                let new_username = this.params[0].trim()
                if (new_username.length == 0) {
                    throw "username must be at least one character"
                }
                console.log(`command - setusername ${connection.username ?? "none"} > ${new_username}`)
                connection.username = new_username
                break;
            case("getonlineusers"):
                let names = []
                for (let value in server.usernames.values()) {
                    names.push(value)
                }
                let msg: Message = {
                    msg_type: "control",
                    payload: new ControlMessage(connection.secure, "onlineusers", names, "[SERVER]")
                }
                connection.send(msg)
                break;
            default:
                throw "invalid control"
        }
    }

}
