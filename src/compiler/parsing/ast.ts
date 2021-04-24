import PlToken, { NewFakePlToken, NewPlToken, PlTokenType } from "../lexing/token";
import { NewFileInfo } from "../lexing/info";

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

export abstract class ASTNode {
    readonly tokens: PlToken[];

    protected constructor(tokens: PlToken[]) {
        this.tokens = tokens;
    }

    firstToken() {
        return this.tokens[0];
    }

    lastToken() {
        return this.tokens[this.tokens.length - 1];
    }

    getSpanToken() {
        try {
            // TODO: this might break if the tokens span multiple lines
            const firstToken = this.firstToken();
            const lastToken = this.lastToken(); // maybe make this the last token on the same line?
            return CreateSpanToken(firstToken, lastToken, this.tokens.map(t => t.content).join(''));
        } catch ( e ) {
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
    block: ASTBlock;

    constructor(tokens: PlToken[], name: ASTVariable, args: ASTVariable[], block: ASTBlock) {
        super(tokens);
        this.name = name;
        this.args = args;
        this.block = block;
    }
}


export class ASTImpl extends ASTStatement {
    name: ASTVariable;
    args: ASTVariable[];
    target: ASTType;
    block: ASTBlock;

    constructor(tokens: PlToken[], name: ASTVariable, args: ASTVariable[], target: ASTType, block: ASTBlock) {
        super(tokens);
        this.name = name;
        this.args = args;
        this.target = target;
        this.block = block;
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
}

export class ASTEach extends ASTStatement {
    value: ASTVariable;
    key?: ASTVariable;
    iterator: ASTExpression;
    block: ASTBlock;


    constructor(tokens: PlToken[], value: ASTVariable, iterator: ASTExpression, block: ASTBlock, key?: ASTVariable ) {
        super(tokens);
        this.value = value;
        this.key = key;
        this.iterator = iterator;
        this.block = block;
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
}

export class ASTWhile extends ASTStatement {
    condition: ASTExpression;
    block: ASTBlock;

    constructor(tokens: PlToken[], condition: ASTExpression, block: ASTBlock) {
        super(tokens);
        this.condition = condition;
        this.block = block;
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

export class ASTAssign extends ASTExpression {
    pre?: ASTExpression; // this can only be a call or dot chain
    variable: ASTVariable;
    value: ASTExpression;

    constructor(tokens: PlToken[], pre: ASTExpression, variable: ASTVariable, value: ASTExpression) {
        super(tokens);
        this.pre = pre;
        this.variable = variable;
        this.value = value;
    }

    firstToken(): PlToken {
        return this.pre == null ? this.variable.getSpanToken() :this.pre.getSpanToken();
    }

    lastToken(): PlToken {
        return this.value.getSpanToken();
    }
}

export class ASTCreate extends ASTAssign {

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
}

export class ASTType extends ASTExpression {
    content: string;

    constructor(tokens: PlToken[], content: string) {
        super(tokens);
        this.content = content;
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
    block: ASTBlock;

    constructor(tokens: PlToken[], args: ASTVariable[], block: ASTBlock) {
        super(tokens);
        this.args = args;
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
