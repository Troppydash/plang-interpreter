import { PlTokenType } from "../lexing/token";

const OpPrecedence = {
    // lower one has lower precedence
    [PlTokenType.ASGN]: 0,

    [PlTokenType.AND]: 1,
    [PlTokenType.OR]: 1,

    [PlTokenType.LT]: 2,
    [PlTokenType.LTE]: 2,
    [PlTokenType.GT]: 2,
    [PlTokenType.GTE]: 2,
    [PlTokenType.EQ]: 2,
    [PlTokenType.NEQ]: 2,

    [PlTokenType.ADD]: 3,
    [PlTokenType.SUB]: 3,

    [PlTokenType.MUL]: 4,
    [PlTokenType.DIV]: 4,

    [PlTokenType.EXP]: 5,
    [PlTokenType.MOD]: 5,
};

export function IsPreHigher(left: PlTokenType, right: PlTokenType) {
    if (!(left in OpPrecedence) || !(right in OpPrecedence)) {
        return false;
    }
    return OpPrecedence[right] > OpPrecedence[left];
}

export function IsPreLower(left: PlTokenType, right: PlTokenType) {
    if (!(left in OpPrecedence) || !(right in OpPrecedence)) {
        return false;
    }
    return OpPrecedence[right] < OpPrecedence[left];
}

