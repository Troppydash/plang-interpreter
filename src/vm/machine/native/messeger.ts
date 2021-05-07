import {PlStuff, PlStuffType, PlStuffTypeToString} from "../stuff";

export function MakeTypeMessage(name: string, expected: PlStuffType, got: PlStuff, position: number = 1): string {
    return `'.${name}' requires the ${position}th argument to be of type ${PlStuffTypeToString(expected)}, got ${PlStuffTypeToString(got.type)} instead`;
}