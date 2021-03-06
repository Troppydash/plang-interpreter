import PlToken, {NewFakePlToken, NewPlToken, PlTokenType} from "../lexing/token";
import {NewFileInfo} from "../lexing/info";

// Classes so we can use the visitor pattern
export type ASTProgram = ASTStatement[];

// TODO: make each class have an enum type so we can use a switch and not instanceof

export function ASTProgramToString(program: ASTProgram): string {
    let statements = [];
    for (const statement of program) {
        statements.push(JSON.stringify(statement));
    }
    return statements.map((str, line) => `Line ${line + 1}| ${str}`).join('\n');
}

export function CreateSpanToken(firstToken: PlToken, lastToken: PlToken, content: string | null = null) {
    if (content == null) {
        content = firstToken.content + lastToken.content;
    }
    return NewPlToken(PlTokenType.SPAN, content,
        NewFileInfo(firstToken.info.row, lastToken.info.col, lastToken.info.col - firstToken.info.col + firstToken.info.length, firstToken.info.filename));
}

/// attributes ///
export enum ASTAttributes {
    ASTCondition = "ASTCondition"
}


export abstract class ASTNode {
    attribute: ASTAttributes | null; // because js doesn't allow casting, so this is for a fake class name
    readonly tokens: PlToken[];

    protected constructor(tokens: PlToken[]) {
        this.tokens = tokens;
        this.attribute = null;
    }

    firstToken() {
        return this.tokens[0];
    }

    lastToken() {
        return this.tokens[this.tokens.length - 1];
    }

    getSpanToken() {
        try {
            const firstToken = this.firstToken();
            const lastToken = this.lastToken()
            if (lastToken.info.row != firstToken.info.row) {
                return firstToken;
            }
            return CreateSpanToken(firstToken, lastToken, this.tokens.map(t => t.content).join(''));
        } catch (e) {
            if (this.tokens.length == 0) {
                return NewFakePlToken(PlTokenType.SPAN, '');
            }
        }
    }

    is(type): boolean {
        return this instanceof type;
    }
}

export abstract class ASTStatement extends ASTNode {
}

export abstract class ASTExpression extends ASTNode {
}

export class ASTBlock extends ASTStatement {
    statements: ASTStatement[];

    constructor(tokens: PlToken[], statements: ASTStatement[]) {
        super(tokens);
        this.statements = statements;
    }
}

export class ASTFunction extends ASTStatement {
    name: ASTVariable;
    args: ASTVariable[];
    guards: (ASTVariable | null)[];
    block: ASTBlock;

    constructor(tokens: PlToken[], name: ASTVariable, args: ASTVariable[], guards: (ASTVariable | null)[], block: ASTBlock) {
        super(tokens);
        this.name = name;
        this.args = args;
        this.guards = guards;
        this.block = block;
    }

    lastToken(): PlToken {
        return this.block.getSpanToken();
    }
}


export class ASTImpl extends ASTStatement {
    name: ASTVariable;
    args: ASTVariable[];
    guards: (ASTVariable | null)[];
    target: ASTVariable;
    block: ASTBlock;


    constructor(tokens: PlToken[], name: ASTVariable, args: ASTVariable[], guards: (ASTVariable | null)[], target: ASTVariable, block: ASTBlock) {
        super(tokens);
        this.name = name;
        this.args = args;
        this.guards = guards;
        this.target = target;
        this.block = block;
    }

    lastToken(): PlToken {
        return this.block.getSpanToken();
    }
}

export class ASTImport extends ASTStatement {
    path: ASTVariable[];
    alias?: ASTVariable;
    select?: ASTVariable[];

    constructor(tokens: PlToken[], path: ASTVariable[], alias?: ASTVariable, select?: ASTVariable[]) {
        super(tokens);
        this.path = path;
        this.alias = alias;
        this.select = select;
    }
}

export class ASTExport extends ASTStatement {
    content: ASTExpression;

    constructor(tokens: PlToken[], content: ASTExpression) {
        super(tokens);
        this.content = content;
    }
}

export class ASTReturn extends ASTStatement {
    content?: ASTExpression;

    constructor(tokens: PlToken[], content?: ASTExpression) {
        super(tokens);
        this.content = content;
    }
}

export class ASTBreak extends ASTStatement {
    constructor(tokens: PlToken[]) {
        super(tokens);
    }
}

export class ASTContinue extends ASTStatement {
    constructor(tokens: PlToken[]) {
        super(tokens);
    }
}

export class ASTIf extends ASTStatement {
    conditions: ASTExpression[]; // all the conditions
    blocks: ASTBlock[]; // all the 'then' blocks
    other?: ASTBlock; // else block

    constructor(tokens: PlToken[], conditions: ASTExpression[], blocks: ASTBlock[], other?: ASTBlock) {
        super(tokens);
        this.conditions = conditions;
        this.blocks = blocks;
        this.other = other;
    }

    lastToken(): PlToken {
        if (this.other) {
            return this.other.getSpanToken();
        }
        return this.blocks[this.blocks.length - 1].getSpanToken();
    }
}

export class ASTEach extends ASTStatement {
    value: ASTVariable;
    key?: ASTVariable;
    iterator: ASTExpression;
    block: ASTBlock;


    constructor(tokens: PlToken[], value: ASTVariable, iterator: ASTExpression, block: ASTBlock, key?: ASTVariable) {
        super(tokens);
        this.value = value;
        this.key = key;
        this.iterator = iterator;
        this.block = block;
    }

    lastToken(): PlToken {
        return this.block.getSpanToken();
    }
}

export class ASTLoop extends ASTStatement {
    amount?: ASTExpression;
    block: ASTBlock;

    constructor(tokens: PlToken[], block: ASTBlock, amount?: ASTExpression,) {
        super(tokens);
        this.amount = amount;
        this.block = block;
    }

    lastToken(): PlToken {
        return this.block.getSpanToken();
    }
}

export class ASTWhile extends ASTStatement {
    condition: ASTExpression;
    block: ASTBlock;

    constructor(tokens: PlToken[], condition: ASTExpression, block: ASTBlock) {
        super(tokens);
        this.condition = condition;
        this.block = block;
    }

    lastToken(): PlToken {
        return this.block.getSpanToken();
    }
}

export class ASTFor extends ASTStatement {
    start?: ASTExpression;
    condition?: ASTExpression;
    after?: ASTExpression;
    block: ASTBlock;

    constructor(tokens: PlToken[], block: ASTBlock, start?: ASTExpression, condition?: ASTExpression, after?: ASTExpression) {
        super(tokens);
        this.start = start;
        this.condition = condition;
        this.after = after;
        this.block = block;
    }

    lastToken(): PlToken {
        return this.block.getSpanToken();
    }
}

export class ASTMatch extends ASTStatement {
    value?: ASTExpression;
    cases: ASTExpression[][];
    blocks: ASTBlock[];
    other?: ASTBlock;

    constructor(tokens: PlToken[], value: ASTExpression | null, cases: ASTExpression[][], blocks: ASTBlock[], other?: ASTBlock) {
        super(tokens);
        this.value = value;
        this.cases = cases;
        this.blocks = blocks;
        this.other = other;
    }
}

export enum ASTAssignType {
    OUTER,
    INNER,
    LOCAL
}

export class ASTAssign extends ASTExpression {
    pre?: ASTExpression; // this can only be a call or dot chain
    variable: ASTVariable;
    value: ASTExpression;
    type: ASTAssignType;

    constructor(tokens: PlToken[], pre: ASTExpression, variable: ASTVariable, value: ASTExpression, type: ASTAssignType) {
        super(tokens);
        this.pre = pre;
        this.variable = variable;
        this.value = value;
        this.type = type;
    }

    firstToken(): PlToken {
        return this.pre == null ? this.variable.getSpanToken() : this.pre.getSpanToken();
    }

    lastToken(): PlToken {
        return this.value.getSpanToken();
    }
}

export class ASTDot extends ASTExpression {
    left: ASTExpression;
    right: ASTVariable;

    constructor(tokens: PlToken[], left: ASTExpression, right: ASTVariable) {
        super(tokens);
        this.left = left;
        this.right = right;
    }

    firstToken(): PlToken {
        return this.left.getSpanToken();
    }

    lastToken(): PlToken {
        return this.right.getSpanToken();
    }
}

export class ASTCall extends ASTExpression {
    target: ASTExpression;
    args: ASTExpression[];

    constructor(tokens: PlToken[], target: ASTExpression, args: ASTExpression[]) {
        super(tokens);
        this.target = target;
        this.args = args;
    }

    firstToken(): PlToken {
        return this.target.getSpanToken();
    }

    lastToken(): PlToken {
        return this.target.getSpanToken();
        // const last = this.tokens[this.tokens.length - 1];
        // if ( last && last.info.row == this.target.getSpanToken().info.row) {
        //     return last;
        // }
        // return this.target.getSpanToken();
    }
}

export class ASTBinary extends ASTExpression {
    left: ASTExpression;
    right: ASTExpression;
    operator: PlToken;

    constructor(tokens: PlToken[], left: ASTExpression, right: ASTExpression, operator: PlToken) {
        super(tokens);
        this.left = left;
        this.right = right;
        this.operator = operator;
    }

    firstToken(): PlToken {
        return this.left.getSpanToken();
    }

    lastToken(): PlToken {
        return this.right.getSpanToken();
    }
}

export class ASTUnary extends ASTExpression {
    operator: PlToken;
    value: ASTExpression;

    constructor(tokens: PlToken[], operator: PlToken, value: ASTExpression) {
        super(tokens);
        this.operator = operator;
        this.value = value;
    }

    isPostfix() {
        return this.operator.type == PlTokenType.INC || this.operator.type == PlTokenType.DEC;
    }

    firstToken(): PlToken {
        if (this.isPostfix()) {
            return this.value.getSpanToken();
        }
        return this.operator;
    }

    lastToken(): PlToken {
        if (this.isPostfix()) {
            return this.operator;
        }
        return this.value.getSpanToken();
    }
}

export class ASTType extends ASTExpression {
    name: ASTVariable;
    members: ASTVariable[];

    constructor(tokens: PlToken[], name: ASTVariable, members: ASTVariable[]) {
        super(tokens);
        this.name = name;
        this.members = members;
    }

    firstToken(): PlToken {
        return this.name.getSpanToken();
    }

    lastToken(): PlToken {
        return this.name.getSpanToken();
    }
}

export class ASTList extends ASTExpression {
    values: ASTExpression[];

    constructor(tokens: PlToken[], values: ASTExpression[]) {
        super(tokens);
        this.values = values;
    }
}

export type ASTDictKey = ASTVariable | ASTNumber | ASTString;

export class ASTDict extends ASTExpression {
    keys: ASTDictKey[];
    values: ASTExpression[];

    constructor(tokens: PlToken[], keys: (ASTVariable | ASTNumber)[], values: ASTExpression[]) {
        super(tokens);
        this.keys = keys;
        this.values = values;
    }
}

export class ASTClosure extends ASTExpression {
    args: ASTVariable[];
    guards: (ASTVariable | null)[];
    block: ASTBlock;


    constructor(tokens: PlToken[], args: ASTVariable[], guards: (ASTVariable | null)[], block: ASTBlock) {
        super(tokens);
        this.args = args;
        this.guards = guards;
        this.block = block;
    }
}

export class ASTNumber extends ASTExpression {
    value: string;

    constructor(tokens: PlToken[], value: string) {
        super(tokens);
        this.value = value;
    }
}

export class ASTBoolean extends ASTExpression {
    value: string;

    constructor(tokens: PlToken[], value: string) {
        super(tokens);
        this.value = value;
    }
}

export class ASTString extends ASTExpression {
    content: string;

    constructor(tokens: PlToken[], content: string) {
        super(tokens);
        this.content = content;
    }
}

export class ASTNull extends ASTExpression {
    constructor(tokens: PlToken[]) {
        super(tokens);
    }
}

export class ASTVariable extends ASTExpression {
    content: string;

    constructor(tokens: PlToken[], content: string) {
        super(tokens);
        this.content = content;
    }
}


