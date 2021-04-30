export enum PlStuffType {
    Num,
    Str,
    Bool,
    Null,
    Type,
    Func,
    NFunc,
    List,
    Dict
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

export function PlStuffTypeFromString(string: string) {
    return PlStuffType[string];
}

export function PlStuffTypeToString(stuffType: PlStuffType): string {
    switch (stuffType) {
        case PlStuffType.Num:
            return "Num";
        case PlStuffType.Type:
            return "Type";
        case PlStuffType.Func:
        case PlStuffType.NFunc:
            return "Func";
        case PlStuffType.Bool:
            return "Bool";
        case PlStuffType.Str:
            return "Str"
        case PlStuffType.Null:
            return "Null";
        case PlStuffType.List:
            return "List";
        case PlStuffType.Dict:
            return "Dict";
    }
}

// optimization
export const PlStuffTrue = NewPlStuff(PlStuffType.Bool, true);
export const PlStuffFalse = NewPlStuff(PlStuffType.Bool, false);
export const PlStuffNull = NewPlStuff(PlStuffType.Null, null);
