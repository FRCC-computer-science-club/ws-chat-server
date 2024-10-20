import {ConnectionMode, INSECURE_TEXT_FLAG, SECURE_TEXT_FLAG} from "./connection";

interface Message_Raw {
    author: string;
    secure: boolean;
    payload: string;
}

export class ChatMessage {
    author: string;
    secure: boolean;
    payload: string;

    constructor(secure: boolean, payload: string, author: string) {
        this.author = author
        this.secure = secure
        this.payload = payload
    }

    serialize(mode: ConnectionMode, connection_id: number): string {
        switch (mode) {
            case ConnectionMode.plaintext:
                let secure_status
                if(this.secure) {
                    secure_status = SECURE_TEXT_FLAG
                } else {
                    secure_status = INSECURE_TEXT_FLAG
                }
                return `${secure_status} ${this.author} : ${this.payload}`
            case ConnectionMode.json:
                let raw:Message_Raw = {
                    author: this.author ?? `connection_${connection_id}`,
                    secure: this.secure,
                    payload: this.payload
                }
                return JSON.stringify(raw)
        }
    }

}
