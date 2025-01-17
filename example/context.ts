import { BaseContext } from "@/bot/process_command"
import { readdir } from 'node:fs/promises'
import path from 'path'

export const moduleFolder = "commands"

export async function getModuleFiles() {
    return (await readdir(`./${moduleFolder}`))
        .map(file => import.meta.resolve(`@/${path.join(moduleFolder, file)}`))
}

export class Context extends BaseContext {

    // can have your own functions 
    // example for sendMessage to send a message back
    sendMessage(input : string) { 
        console.log(input)
    }
}
