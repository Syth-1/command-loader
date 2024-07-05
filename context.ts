import { BaseContext } from "./bot/process_command"
import { readdir } from 'node:fs/promises'
import path from 'path'

export const moduleFolder = "commands"

export async function getModuleFiles() {
    return (await readdir(`./${moduleFolder}`))
        .map(file => `@/${path.join(moduleFolder, file)}`)
}

export class Context extends BaseContext {

    constructor() {
        super()
    }
} 