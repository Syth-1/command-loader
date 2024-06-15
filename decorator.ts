import 'reflect-metadata'
import { Commands } from './module_loader'

export function logParamTypes(command? : string) {
    return (target : any, key : string, descriptor: PropertyDescriptor) => {
        command = command || key

        var types = Reflect.getMetadata("design:paramtypes", target, key);

        var s = types.map((a: { name: any; }) => { console.log(typeof a); return a.name;} ).join();
        console.log(`${key} param types: ${s}`);

        const childFunction = descriptor.value;
        descriptor.value = function (...args: any[]) {
            console.log("beofore call")
            const retVal = childFunction.apply(this, args);
            console.log("after call")
            return retVal
        }

        Commands.commands[command] = descriptor.value
    }
}