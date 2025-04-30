import { readdir } from 'node:fs/promises'
import path from 'path'

export async function getModuleFiles(root: string, moduleFolder : string) {
    moduleFolder = path.join(root, moduleFolder)

    return (await readdir(moduleFolder, { recursive : true, withFileTypes : true } )).filter(f => f.isFile())
        .map(file =>  {
            return path.join(file.parentPath, file.name)
        })
}