export function getFuncName(obj? : Function | string) { 
    if (obj === undefined) return `${obj}`

    if (typeof obj === 'function') {
        obj = obj.name
    }
    return obj.replace(/bound /gi, '')
}