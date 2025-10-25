import type { StringParser } from "@/bot/string_parser"

// this file is no longer affected by reloads due to using `useCache`
// whole program will need to be restarted for changes to take effect
// this is important for shared imported files, where you may need to check if a class is the same

// note: if the import cache is cleared without `useCache`, the same class will have a different internal memory ref
// this means even though 2 files have the same* class, they are not equal to each other.

// this causes all exports to be cached
// your program can still modify the values, and it will be synced across all other imports due to sharing the same memory ref.
export const useCache = true

export const value = 0

export class StringEx extends String { }

export const stringRegistry = {
    [StringEx.name]: { 
        name : "string",
        func : (ctx : Context, stringParser : StringParser) => {
            return stringParser.getRestOfString()
        }
    }
}
