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

    constructor(str : string) { 
        this.internalString = str; 
    }

    splitStr(str : string) : Array<string> { 
        const preSplit = str.split(/\s/gm, 1)[0]
        const postSplit = str.substring(preSplit == '' ? 1 : preSplit.length);

        return [preSplit, postSplit]
    }

    getArg(quoted : boolean = true) : string {
        let [arg, str] = this.splitStr(this.internalString)
        this.internalString = str

        if (this.internalString.length != 0 && arg == '') {
            return this.getArg(quoted)
        }

        if (quoted) {
            this.extractQuotedString(arg)
        }

        if (arg == '') throw new CommandError.EndOfArgs("END OF STRING")

        return arg
    }

    extractQuotedString(arg : string) {
        for (const [startQuote, endQuote] of Object.entries(quotes)) {
            if (arg.match(quoteRegex[startQuote].startQuoteRegex)) {

                const quotedStringRegex = this.internalString.match(quoteRegex[startQuote].endQuoteRegex)

                if (quotedStringRegex == null || quotedStringRegex.length == 0) {
                    continue
                }

                let quotedString = quotedStringRegex[0]
                const removeLength = quotedString.length

                quotedString = quotedString.substring(0, quotedString.indexOf(endQuote))
                arg = arg.substring(1) + quotedString
                
                this.internalString = this.internalString.substring(removeLength)

                break;
            }
        }
    }

    getRestOfString() {
        return this.internalString.trim()
    }

    getMultiple(amount : number) { 
        return Array(amount).fill(0).map(() => this.getArg());
    }
}