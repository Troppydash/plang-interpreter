import {PlStuff, PlStuffType, PlStuffTypeToString} from "../stuff";

export function MakeTypeMessage(name: string, expected: PlStuffType, got: PlStuff, position: number): string {
    return `'${name}' requires the ${position}th argument to be of type ${PlStuffTypeToString(expected)} - got ${PlStuffTypeToString(got.type)} instead`;
}

export function MakeArityMessage(name: string, expected: number, got: number) {
    return `'${name}' received an incorrect amount of arguments - it needed ${expected} but got ${got}`;
}

export function MakeOperatorMessage(name: string, left: PlStuffType, right: PlStuffType) {
    return `the operator '${name}' cannot operate on different types on the left and the right - left is ${PlStuffTypeToString(left)}, right is ${PlStuffTypeToString(right)}`;
}

export function MakeOutOfRangeMessage(name: string, type: PlStuffType, length: number, got: number) {
    return `'${name}' accessed an element out of range on a ${PlStuffTypeToString(type)}: expected ${length == 0 ? '0': '1'}-${length}, got ${got+1}`;
}

export function MakeNotFoundMessage(name: string, type: PlStuffType, key: string) {
    return `'${name}' cannot find the key '${key}' on a ${PlStuffTypeToString(type)}`;
}

export function MakeNoTypeFunctionMessage(name: string, method: string, got: PlStuff) {
    return `'${name}' need the method '${method}' on ${PlStuffTypeToString(got.type)}, but none was found`;
}
