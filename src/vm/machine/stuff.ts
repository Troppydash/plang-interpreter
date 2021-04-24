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

// optimization
export const PlStuffTrue = NewPlStuff(PlStuffType.BOOLEAN, true);
export const PlStuffFalse = NewPlStuff(PlStuffType.BOOLEAN, false);
export const PlStuffNull = NewPlStuff(PlStuffType.NULL, null);
