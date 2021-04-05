import PlToken from "../lexing/token";

// Classes so we can use the visitor pattern

abstract class ASTStatement {
    readonly tokens: PlToken[]; // these are the tokens for the keywords

    protected constructor( tokens: PlToken[] ) {
        this.tokens = tokens;
    }
}

abstract class ASTExpression {
    readonly tokens: PlToken[]; // these are the tokens for the actual content or keywords

    protected constructor( tokens: PlToken[] ) {
        this.tokens = tokens;
    }
}

class ASTBlock extends ASTStatement {
    statements: ASTStatement[];

    constructor( tokens: PlToken[], statements: ASTStatement[] ) {
        super( tokens );
        this.statements = statements;
    }
}

class ASTFunction extends ASTStatement {
    name: ASTVariable;
    args: ASTVariable[];
    block: ASTBlock;

    constructor( tokens: PlToken[], name: ASTVariable, args: ASTVariable[], block: ASTBlock ) {
        super( tokens );
        this.name = name;
        this.args = args;
        this.block = block;
    }
}


class ASTImpl extends ASTStatement {
    name: ASTVariable;
    args: ASTVariable[];
    target: ASTExpression;
    block: ASTBlock;

    constructor( tokens: PlToken[], name: ASTVariable, args: ASTVariable[], target: ASTExpression, block: ASTBlock ) {
        super( tokens );
        this.name = name;
        this.args = args;
        this.target = target;
        this.block = block;
    }
}


class ASTImport extends ASTStatement {
    path: ASTVariable[];
    alias?: ASTVariable;
    select?: ASTVariable[];

    constructor( tokens: PlToken[], path: ASTVariable[], alias?: ASTVariable, select?: ASTVariable[] ) {
        super( tokens );
        this.path = path;
        this.alias = alias;
        this.select = select;
    }
}

class ASTExport extends ASTStatement {
    content: ASTExpression;

    constructor( tokens: PlToken[], content: ASTExpression ) {
        super( tokens );
        this.content = content;
    }
}

class ASTReturn extends ASTStatement {
    content?: ASTExpression;

    constructor( tokens: PlToken[], content?: ASTExpression ) {
        super( tokens );
        this.content = content;
    }
}

class ASTBreak extends ASTStatement {
    constructor( tokens: PlToken[] ) {
        super( tokens );
    }
}

class ASTContinue extends ASTStatement {
    constructor( tokens: PlToken[] ) {
        super( tokens );
    }
}

class ASTIf extends ASTStatement {
    conditions: ASTExpression; // all the conditions
    blocks: ASTBlock[]; // all the 'then' blocks
    other?: ASTBlock; // else block


    constructor( tokens: PlToken[], conditions: ASTExpression, blocks: ASTBlock[], other?: ASTBlock ) {
        super( tokens );
        this.conditions = conditions;
        this.blocks = blocks;
        this.other = other;
    }
}

class ASTEach extends ASTStatement {
    value: ASTVariable;
    index?: ASTVariable;
    iterator: ASTExpression;

    constructor( tokens: PlToken[], value: ASTVariable, iterator: ASTExpression, index?: ASTVariable ) {
        super( tokens );
        this.value = value;
        this.index = index;
        this.iterator = iterator;
    }
}

class ASTLoop extends ASTStatement {
    amount?: ASTExpression;
    block: ASTBlock;

    constructor( tokens: PlToken[], block: ASTBlock, amount?: ASTExpression, ) {
        super( tokens );
        this.amount = amount;
        this.block = block;
    }
}

class ASTWhile extends ASTStatement {
    condition: ASTExpression;
    block: ASTBlock;

    constructor( tokens: PlToken[], condition: ASTExpression, block: ASTBlock ) {
        super( tokens );
        this.condition = condition;
        this.block = block;
    }
}

class ASTFor extends ASTStatement {
    start?: ASTExpression;
    condition?: ASTExpression;
    after?: ASTExpression;
    block: ASTBlock;

    constructor( tokens: PlToken[], block: ASTBlock, start?: ASTExpression, condition?: ASTExpression, after?: ASTExpression ) {
        super( tokens );
        this.start = start;
        this.condition = condition;
        this.after = after;
        this.block = block;
    }
}

class ASTMatch extends ASTStatement {
    value: ASTExpression;
    cases: ASTExpression[];
    blocks: ASTBlock[];
    other?: ASTBlock;

    constructor( tokens: PlToken[], value: ASTExpression, cases: ASTExpression[], blocks: ASTBlock[], other?: ASTBlock ) {
        super( tokens );
        this.value = value;
        this.cases = cases;
        this.blocks = blocks;
        this.other = other;
    }
}

// do the expressions next
// special cases for asgn and call and dot
// also write list and dict

class ASTBinary extends ASTStatement {
    left: ASTExpression;
    right: ASTExpression;
    operator: PlToken;

    constructor( tokens: PlToken[], left: ASTExpression, right: ASTExpression, operator: PlToken ) {
        super( tokens );
        this.left = left;
        this.right = right;
        this.operator = operator;
    }
}

class ASTUnary extends ASTStatement {
    operator: PlToken;
    value: ASTExpression;
    isPrefix: boolean;

    constructor( tokens: PlToken[], operator: PlToken, value: ASTExpression, isPrefix: boolean = true) {
        super( tokens );
        this.operator = operator;
        this.value = value;
        this.isPrefix = isPrefix;
    }
}

class ASTType extends ASTExpression {
    content: string;

    constructor( tokens: PlToken[], content: string ) {
        super( tokens );
        this.content = content;
    }
}

class ASTClosure extends ASTExpression {
    args: ASTVariable[];
    block: ASTBlock;

    constructor( tokens: PlToken[], args: ASTVariable[], block: ASTBlock ) {
        super( tokens );
        this.args = args;
        this.block = block;
    }
}

class ASTNumber extends ASTExpression {
    value: number;

    constructor( tokens: PlToken[], value: number ) {
        super( tokens );
        this.value = value;
    }
}

class ASTBoolean extends ASTExpression {
    value: boolean;

    constructor( tokens: PlToken[], value: boolean ) {
        super( tokens );
        this.value = value;
    }
}

class ASTString extends ASTExpression {
    content: string;

    constructor( tokens: PlToken[], content: string ) {
        super( tokens );
        this.content = content;
    }
}

class ASTNull extends ASTExpression {
    constructor( tokens: PlToken[] ) {
        super( tokens );
    }
}

class ASTVariable extends ASTExpression {
    content: string;

    constructor( tokens: PlToken[], content: string ) {
        super( tokens );
        this.content = content;
    }
}
