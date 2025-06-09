import { CommandError } from "./internals"

const quotes = {
    '"' : '"',
    "'" : "'",
}

interface quoteRegex { 
    [key: string] : {
        startQuoteRegex : string | RegExp
        endQuoteRegex   : string | RegExp
    }
}

const quoteRegex : quoteRegex = Object.fromEntries(
    Object.entries(quotes).map(([startQuote, endQuote]) => [
        startQuote,
        {
            startQuoteRegex :  new RegExp(`^\\s*${startQuote}.*(?<!${endQuote})\\s*\$`),
            endQuoteRegex   :  new RegExp(`^.*?${endQuote}(?:\\s|\$)`, 'gs')
        }
    ])
);

export class StringParser{ 
    private internalString : string
    private throwError : boolean

    constructor(str : string, throwError = true) { 
        this.internalString = str;
        this.throwError = throwError
    }

    getArg(quoted : boolean = true) : string {
        let [arg, str] = this.splitStr(this.internalString)
        this.internalString = str

        if (this.internalString.length != 0 && arg === '') {
            return this.getArg(quoted)
        }

        if (quoted) {
            const quotedString = this.extractQuotedString(arg)
            
            if (quotedString) 
                return quotedString
        }

        if (arg === '' && this.throwError) throw new CommandError.EndOfArgs("END OF STRING")

        return arg
    }

    peekArg(quoted: boolean = true): string {
        const savedInternalString = this.internalString
        
        try {
            return this.getArg(quoted)
        } catch (error) {
            throw error
        } finally { 
            this.internalString = savedInternalString
        }
    }

    getRestOfString() {
        const restOfString = this.internalString.trim()

        if (restOfString === '' && this.throwError) {
            throw new CommandError.EndOfArgs("END OF STRING")
        }

        return restOfString
    }

    getMultiple(amount : number) { 
        return Array(amount).fill(0).map(() => this.getArg());
    }

    private splitStr(str : string) : Array<string> { 
        const preSplit = str.split(/\s/gm, 1)[0]
        const postSplit = str.substring(preSplit === '' ? 1 : preSplit.length);

        return [preSplit, postSplit]
    }

    private extractQuotedString(arg : string) {
        for (const [startQuote, endQuote] of Object.entries(quotes)) {
            if (arg.match(quoteRegex[startQuote].startQuoteRegex)) {

                const quotedStringRegex = this.internalString.match(quoteRegex[startQuote].endQuoteRegex)

                if (quotedStringRegex === null || quotedStringRegex.length === 0) {
                    continue
                }

                let quotedString = quotedStringRegex[0]
                const removeLength = quotedString.length

                quotedString = quotedString.substring(0, quotedString.indexOf(endQuote))
                arg = arg.substring(1) + quotedString
                
                this.internalString = this.internalString.substring(removeLength)

                return arg
            }
        }

        return undefined
    }
}