export enum PlStuffType {
    NUMBER,
    STRING,
    BOOLEAN,
    NULL,
    TYPE,
    BLOCK,
    FUNCTION,
    NFUNCTION,
}

export interface PlStuff {
    type: PlStuffType;
    value: any;
}

export function NewPlStuff(type: PlStuffType, value: any): PlStuff {
    return {
        type,
        value
    };
}

export function PlStuffToTypeString(stuffType: PlStuffType): string {
    switch (stuffType) {
        case PlStuffType.NUMBER:
            return "Int";
        case PlStuffType.TYPE:
            return "Type";
        case PlStuffType.FUNCTION:
        case PlStuffType.NFUNCTION:
            return "Func";
        case PlStuffType.BOOLEAN:
            return "Bool";
        case PlStuffType.STRING:
            return "Str"
        case PlStuffType.NULL:
            return "Null";
        default:
            return "Null";
    }
}

// optimization
export const PlStuffTrue = NewPlStuff(PlStuffType.BOOLEAN, true);
export const PlStuffFalse = NewPlStuff(PlStuffType.BOOLEAN, false);
export const PlStuffNull = NewPlStuff(PlStuffType.NULL, null);
