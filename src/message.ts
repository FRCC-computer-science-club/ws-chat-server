import {ChatMessage} from "./chatMessage";
import {ControlMessage, SERVER_CTRL_CHAR} from "./controlMessage";
import {ConnectionMode} from "./connection";

export type Message = {
    msg_type: "chat", payload: ChatMessage
} | {
    msg_type: "control"
    payload: ControlMessage
}

export function serialize_message(msg: Message, mode: ConnectionMode,connection_id: number): String {
    return msg.payload.serialize(mode,connection_id)
}

export function deserialize_message(mode: ConnectionMode, str: string, secure: boolean, author: string): Message {
    switch (mode) {
        case ConnectionMode.plaintext:
            // check if message is control message
            if (str.startsWith(SERVER_CTRL_CHAR)) {
                let parts = str.split(" ");
                let cmd = parts[1] ?? "";
                let params = (parts[2] ?? "").split(",")
                return {
                    msg_type: "control", payload: new ControlMessage(secure, cmd, params, author)
                };
            } else {
                return {
                    msg_type: "chat", payload: new ChatMessage(secure, str, author)
                };
            }
        case ConnectionMode.json:
            throw "json support has not yet been implemented (sorrrrryyyy)";
    }
}
