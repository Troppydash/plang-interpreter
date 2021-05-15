import { PlBytecodeType } from "../emitter/bytecode";
import { PlDebug, PlDebugProgram } from "../emitter/debug";
import { PlFunction, PlInstance, PlNativeFunction, PlStackFrame, PlType } from "./memory";
import { NewPlProblem, PlProblem } from "../../problem/problem";
import {
    NewPlStuff,
    PlStuff,
    PlStuffFalse,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypes,
    PlStuffTypeToString
} from "./stuff";
import { jsModules, jsNatives, natives } from "./native";
import { ScrambleImpl, UnscrambleFunction } from "./scrambler";
import { PlProblemCode } from "../../problem/codes";
import { PlActions, PlConverter } from "./native/converter";
import { PlProgramWithDebug } from "../emitter";
import { NewPlTraceFrame } from "../../problem/trace";
import { PlInout } from "../../inout";

const JUMP_ERRORS: Record<string, PlProblemCode> = {
    "*": "RE0010",
    "ASTCondition": "RE0014",
};

export const CTOR_NAME = "new";

export interface StackMachine {
    findValue( key: string );

    createValue( key: string, value: PlStuff );

    setValue( key: string, value: PlStuff );

    runFunction( func: PlStuff, args: PlStuff[] ): PlStuff | null;

    findFunction(name: string, target?: PlStuff): PlStuff | null;

    saveState(): StackMachineState;
    restoreState(state: StackMachineState);

    stack: PlStuff[];
    problems: PlProblem[];
    readonly inout: PlInout;
}

interface StackMachineState {
    stack: PlStuff[],
    stackFrame: PlStackFrame;
    closureFrames: PlStackFrame[];
    pointer: number;
}

export class PlStackMachine implements StackMachine {
    readonly inout: PlInout;

    stackFrame: PlStackFrame;
    closureFrames: PlStackFrame[];

    stack: PlStuff[];

    problems: PlProblem[];

    program: PlProgramWithDebug | null;
    pointer: number;

    constructor( inout: PlInout, global: Record<string, PlStuff> = {} ) {
        this.inout = inout;

        this.stackFrame = new PlStackFrame( null, NewPlTraceFrame( "file" ) );
        this.closureFrames = [];

        this.program = { program: [], debug: [] };
        this.rearm();

        this.seedFrame( global );
    }


    get closureFrame() {
        return this.closureFrames[this.closureFrames.length - 1];
    }


    addProgram( program: PlProgramWithDebug ) {
        this.program.program = [...this.program.program, ...program.program];
        this.program.debug = [...this.program.debug, ...program.debug];
    }

    rearm() {
        this.problems = [];
        this.stack = [];
        this.pointer = this.program.program.length;

        // reset stackframe
        let sf = this.stackFrame;
        while (sf.outer != null) {
            sf = sf.outer;
        }
        this.stackFrame = sf;
    }

    saveState(): StackMachineState {
        return {
            stack: [...this.stack],
            stackFrame: this.stackFrame,
            closureFrames: [...this.closureFrames],
            pointer: this.pointer
        };
    }

    restoreState( state: StackMachineState ) {
        this.stack = state.stack;
        this.stackFrame = state.stackFrame;
        this.closureFrames = state.closureFrames;
        this.pointer = state.pointer;
    }

    findFunction(name: string, target?: PlStuff): PlStuff | null {
        const value = this.findValue(ScrambleImpl(name, target));
        if (value == null) {
            return null;
        }

        if (value.type == PlStuffType.NFunc || value.type == PlStuffType.Func) {
            return value;
        }
        return null;
    }

    jumpFunction(func: PlStuff, callDebug: PlDebug, args: PlStuff[]) {
        const value = func.value as PlFunction;

        const parameters = value.parameters;
        if ( parameters.length != args.length ) {
            this.newProblem( "RE0006", this.pointer, this.program.debug, '' + parameters.length, '' + args.length );
            return null;
        }

        this.closureFrames.push( value.closure );
        this.stackFrame = new PlStackFrame( this.stackFrame, value.closure.trace );
        if ( callDebug ) {
            this.stackFrame.setTraceInfo( callDebug.span.info );
        }

        // assign variables
        for ( let i = 0; i < args.length; ++i ) {
            this.createValue( parameters[i], args[i] );
        }
        this.createValue( value.closure.trace.name, func ); // so we can never actually modify the function

        this.pushStack( NewPlStuff( PlStuffType.Num, this.pointer ) ); // return address
        this.pointer = value.index;
    }

    runFunction( func: PlStuff, args: PlStuff[] ): PlStuff | null {
        if (func.type == PlStuffType.NFunc) {
            return func.value.native(...args);
        }

        const { debug } = this.program;
        const value = func.value as PlFunction;

        const parameters = value.parameters;
        if ( parameters.length != args.length ) {
            this.newProblem( "RE0006", this.pointer, debug, '' + parameters.length, '' + args.length );
            throw null;
        }

        this.closureFrames.push( value.closure );
        this.stackFrame = new PlStackFrame( this.stackFrame, value.closure.trace );

        if ( debug ) {
            const callDebug = debug.filter( d => d.endLine == this.pointer + 1 ).pop();
            this.stackFrame.setTraceInfo( callDebug.span.info );
        }

        // assign variables
        for ( let i = 0; i < args.length; ++i ) {
            this.createValue( parameters[i], args[i] );
        }
        this.createValue( value.closure.trace.name, func ); // so we can never actually modify the function

        this.pushStack( null ); // return address
        const old = this.pointer;
        const out = this.runProgram( value.index + 1 );
        if ( out == null ) {
            throw null; // error
        }

        this.pointer = old;

        return out;
    }

    seedFrame( global: Record<string, PlStuff> ) {
        for ( const [ key, entry ] of Object.entries( jsNatives ) ) {
            const pl = PlConverter.JsToPl( entry, this.runFunction.bind( this ) );
            pl.value.name = UnscrambleFunction( key )[1];
            this.stackFrame.createValue(
                key,
                pl
            );
        }

        for ( const [ key, entry ] of Object.entries( natives ) ) {
            this.stackFrame.createValue(
                key,
                NewPlStuff( PlStuffType.NFunc, {
                    native: entry,
                    name: UnscrambleFunction( key )[1],
                } as PlNativeFunction )
            );
        }

        for ( const [ key, entry ] of Object.entries( jsModules ) ) {
            this.stackFrame.createValue(
                key,
                PlConverter.JsToPl( entry, this.runFunction.bind( this ) )
            );
        }

        for ( const [ key, entry ] of Object.entries( global ) ) {
            this.stackFrame.createValue(
                key,
                entry
            );
        }

        // types
        for (const key of PlStuffTypes) {
            this.stackFrame.createValue(
                key,
                NewPlStuff(PlStuffType.Type, {
                    type: key,
                    format: null
                } as PlType)
            )
        }
    }

    peekStack( degree: number = 0 ): PlStuff | null {
        const index = this.stack.length - 1 - degree;
        if ( index < 0 )
            return null;
        return this.stack[index];
    }

    pushStack( stuff: PlStuff ) {
        this.stack.push( stuff );
    }

    popStack(): PlStuff {
        return this.stack.pop();
    }

    newProblem( code: Record<string, PlProblemCode> | PlProblemCode, line: number, debugs?: PlDebugProgram, ...args: string[] ) {
        if ( !debugs ) {
            return;
        }

        let surrounding: PlDebug = null;
        for ( const debug of debugs ) {
            if ( line < (debug.endLine) && line >= (debug.endLine - debug.length) ) {
                if ( surrounding == null ) {
                    surrounding = debug;
                } else if ( debug.length < surrounding.length ) {
                    surrounding = debug;
                }
            }
        }

        args = args.filter( a => a != undefined );
        if ( surrounding == null ) {
            this.problems.push( NewPlProblem( typeof code == "string" ? code : code["*"], null, ...args ) );
            return;
        }

        if ( typeof code == "string" ) {
            this.problems.push( NewPlProblem( code, surrounding.span.info, ...args ) );
            return;
        }

        if ( surrounding.name in code ) {
            this.problems.push( NewPlProblem( code[surrounding.name], surrounding.span.info, ...args ) );
            return;
        }

        if ( "*" in code ) {
            this.problems.push( NewPlProblem( code["*"], surrounding.span.info, ...args ) );
            return;
        }

        this.problems.push( NewPlProblem( "RE0002", null, '' + (line+1) ) );
    }

    getProblems() {
        return this.problems;
    }

    getTrace() {
        const trace = [];
        let frame = this.stackFrame;
        while ( true ) {
            if ( frame.trace != null )
                trace.push( frame.trace );
            if ( (frame = frame.outer) == null ) {
                break;
            }
        }
        if ( this.problems.length > 0 ) {
            const error = this.problems[0];
            trace[0].info = error.info;
        }
        trace.pop(); // this works because we pop the first and last trace
        return trace;
    }

    jump( amount: number ) {
        if ( amount < 0 ) {
            this.pointer += amount - 2; // this because i am stupid at emitting bytecode jumps
            return;
        }
        this.pointer += amount;
    }

    findValue( key: string ) {
        let value = this.stackFrame.findValue( key );
        if ( value != null ) {
            return value;
        }
        if ( this.closureFrames.length != 0 ) {
            value = this.closureFrame.findValueDeep( key );
            if ( value != null ) {
                return value;
            }
        }
        return this.stackFrame.findValueDeep( key );
    }

    createValue( key: string, value: PlStuff ) {
        return this.stackFrame.createValue( key, value );
    }

    setValue( key: string, value: PlStuff ) {
        if ( this.stackFrame.findValue( key ) == null && this.closureFrames.length != 0 && this.closureFrame.findValueDeep( key ) != null ) {
            return this.closureFrame.setValue( key, value );
        }
        return this.stackFrame.setValue( key, value );
    }

    runProgram( position: number = this.pointer ): PlStuff | null {
        /// WE ASSUME THAT THE PROGRAM IS VALID AND ONLY HANDLE RUNTIME ERRORS HERE NOT JS EXCEPTIONS
        const { program, debug } = this.program;
        this.pointer = position;
        try {
            while ( this.pointer < program.length ) {
                const byte = program[this.pointer];
                switch ( byte.type ) {
                    case PlBytecodeType.STKPOP: {
                        this.popStack();
                        break;
                    }
                    case PlBytecodeType.DEFNUM: {
                        this.pushStack( NewPlStuff( PlStuffType.Num, +byte.value ) );
                        break;
                    }
                    case PlBytecodeType.DEFSTR: {
                        this.pushStack( NewPlStuff( PlStuffType.Str, byte.value ) );
                        break;
                    }
                    case PlBytecodeType.DEFBOL: {
                        if ( byte.value == '1' )
                            this.pushStack( PlStuffTrue );
                        else
                            this.pushStack( PlStuffFalse );
                        break;
                    }
                    case PlBytecodeType.DEFNUL: {
                        this.pushStack( PlStuffNull );
                        break;
                    }
                    case PlBytecodeType.DEFTYP: {
                        const name = this.popStack();
                        const arity = this.popStack();

                        const members = [];
                        for (let i = 0; i < arity.value; i++)
                            members.push(this.popStack().value);

                        this.pushStack(NewPlStuff(PlStuffType.Type, {
                            type: name.value,
                            format: members
                        } as PlType));
                        break;
                    }
                    case PlBytecodeType.DEFETY: {
                        this.pushStack( null );
                        break;
                    }
                    case PlBytecodeType.DEFVAR: {
                        let name = byte.value;

                        // try to find it in the stack frame
                        let value = this.findValue( name );
                        if ( value != null ) {
                            this.pushStack( value );
                            break;
                        }

                        const left = this.peekStack( 1 );
                        if ( left != null ) {
                            let value = this.findValue( ScrambleImpl( name, left ) )
                            if ( value != null ) {
                                this.pushStack( value );
                                break;
                            }
                        }

                        this.newProblem( {
                            "ASTVariable": "RE0003",
                            "ASTBinary": "RE0004",
                        }, this.pointer, debug, name, left ? PlStuffTypeToString( left.type ) : undefined );
                        return null;
                    }
                    case PlBytecodeType.DEFLST: {
                        const length = this.popStack();
                        let values = [];
                        for ( let i = 0; i < length.value; ++i ) {
                            values.push( PlActions.PlCopy( this.popStack() ) );
                        }
                        this.pushStack( NewPlStuff( PlStuffType.List, values ) );
                        break;
                    }
                    case PlBytecodeType.DEFDIC: {
                        let object = {};
                        const amount = this.popStack();
                        for ( let i = 0; i < +amount.value; ++i ) {
                            const key = this.popStack();
                            object[key.value] = PlActions.PlCopy( this.popStack() );
                        }

                        this.pushStack( NewPlStuff( PlStuffType.Dict, object ) );
                        break;
                    }

                    case PlBytecodeType.DEFFUN: {
                        const arity = this.popStack();
                        const parameters: string[] = [];
                        for ( let i = 0; i < arity.value; ++i ) {
                            parameters.push( this.popStack().value as string );
                        }
                        // block
                        const length = +byte.value;

                        this.pushStack( NewPlStuff( PlStuffType.Func, {
                            closure: new PlStackFrame( this.stackFrame, NewPlTraceFrame( "closure" ) ),
                            parameters,
                            index: this.pointer,
                        } as PlFunction ) );
                        this.pointer += length;
                        break;
                    }

                    case PlBytecodeType.DOOINC:
                    case PlBytecodeType.DOODEC: {
                        const value = this.popStack();
                        if ( value.type == PlStuffType.Num ) {
                            if ( byte.type == PlBytecodeType.DOOINC )
                                value.value++;
                            else
                                value.value--;
                            this.pushStack( value );
                            break;
                        }
                        this.newProblem( {
                            "*": "RE0011",
                            "ASTCondition": "RE0015",
                        }, this.pointer, debug, PlStuffTypeToString( value.type ) );
                        return null;
                    }

                    case PlBytecodeType.DONEGT: {
                        const value = this.popStack();
                        if ( value.type == PlStuffType.Num ) {
                            value.value = -value.value;
                            this.pushStack( value );
                            break;
                        }
                        this.newProblem( "RE0005", this.pointer, debug, PlStuffTypeToString( value.type ) );
                        return null;
                    }

                    case PlBytecodeType.DOLNOT: {
                        const value = this.popStack();
                        if ( value.type == PlStuffType.Bool ) {
                            this.pushStack( value.value == true ? PlStuffFalse : PlStuffTrue );
                            break;
                        }
                        this.newProblem( "RE0017", this.pointer, debug, PlStuffTypeToString( value.type ) );
                        return null;
                    }

                    case PlBytecodeType.DOCRET:
                    case PlBytecodeType.DOASGN: {
                        const name = this.popStack(); // is a string
                        const target = this.popStack();
                        const value = PlActions.PlCopy( this.popStack() );

                        if ( target == null ) {
                            if ( value.type == PlStuffType.Func ) {
                                const content = value.value as PlFunction;
                                content.closure.setTraceName( name.value );
                            }
                            // set name to value
                            if ( byte.type == PlBytecodeType.DOCRET ) {
                                this.createValue( name.value, value );
                            } else {
                                this.setValue( name.value, value );
                            }
                            this.pushStack( value );
                            break;
                        }

                        // target is not null
                        if ( target.type == PlStuffType.Dict ) {
                            if ( name.value in target.value ) {
                                target.value[name.value] = value;
                                this.pushStack( value );
                                break;
                            }
                        } else if (target.type == PlStuffType.Inst) {
                            if (name.value in target.value.value) {
                                target.value.value[name.value] = value;
                                this.pushStack(value);
                                break;
                            }
                        }

                        this.newProblem( "RE0013", this.pointer, debug, PlStuffTypeToString( target.type ) );
                        return null;
                    }

                    case PlBytecodeType.DOCALL: {
                        const func = this.popStack();
                        if ( func.type != PlStuffType.Func && func.type != PlStuffType.NFunc && func.type != PlStuffType.Type ) {
                            this.newProblem( "RE0008", this.pointer, debug, PlStuffTypeToString( func.type ) );
                            return null;
                        }

                        // get arguments
                        const arity = this.popStack();
                        let args: PlStuff[] = [];
                        for ( let i = 0; i < +arity.value; ++i ) {
                            args.push( PlActions.PlCopy( this.popStack() ) );
                        }
                        if ( func.value.self ) {
                            args = [ PlActions.PlCopy( func.value.self ), ...args ];
                        }

                        // get debug
                        let callDebug: PlDebug;
                        if ( debug ) {
                            callDebug = debug.filter( d => d.endLine == this.pointer + 1 ).pop();
                        }

                        // call function
                        switch ( func.type ) {
                            case PlStuffType.Type: {
                                const value = func.value as PlType;
                                // TODO: Debating whether to run the new function on these types as well
                                if (value.format == null) {
                                    if (args.length != 1) {
                                        this.newProblem( "RE0006", this.pointer, debug, '1', '' + args.length );
                                        return null;
                                    }
                                    const got = args[0];
                                    // convert to type
                                    this.pushStack(PlConverter.PlToPl(got, value));
                                    break;
                                }

                                // create new instance
                                const obj = {};
                                for (const member of value.format) {
                                    obj[member] = PlStuffNull;
                                }

                                const instance = NewPlStuff(PlStuffType.Inst, {
                                    type: value.type,
                                    value: obj
                                } as PlInstance);

                                // get new method if exists
                                const ctor = this.findFunction(CTOR_NAME, instance);
                                if (ctor == null) {
                                    if (args.length > 0) {
                                        this.newProblem( "RE0006", this.pointer, debug, '0', '' + args.length );
                                        return null;
                                    }
                                    this.pushStack(instance);
                                    break;
                                }
                                // call constructor // TODO: make this a jump sometime
                                try {
                                    this.runFunction(ctor, [instance, ...args]); // need run function, so we can pop and push
                                } catch ( e ) {
                                    return null;
                                }
                                this.pushStack(instance);

                                break;
                            }
                            case PlStuffType.NFunc: {
                                const value = func.value as PlNativeFunction;
                                const stackFrame = this.stackFrame;
                                try {
                                    this.pushStack( value.native.bind( this )( ...args ) );
                                } catch ( e ) {
                                    // insert stackFrame
                                    if ( stackFrame == this.stackFrame ) {
                                        this.stackFrame = new PlStackFrame( this.stackFrame, NewPlTraceFrame( value.name, callDebug.span.info ) );
                                    } else {
                                        let sf = this.stackFrame;
                                        while ( sf.outer != stackFrame ) {
                                            sf = sf.outer;
                                        }
                                        sf.outer = new PlStackFrame( stackFrame, NewPlTraceFrame( value.name, callDebug.span.info ) )
                                    }

                                    if ( e != null ) {
                                        this.newProblem( "RE0007", this.pointer, debug, e.message );
                                    }
                                    return null;
                                }
                                break;
                            }
                            case PlStuffType.Func: {
                                this.jumpFunction(func, callDebug, args);
                                break;
                            }
                        }
                        break;
                    }

                    case PlBytecodeType.DOFIND: {
                        const bKey = this.popStack();
                        const bTarget = this.popStack();

                        const name = bKey.value;
                        if ( bTarget.type == PlStuffType.Dict ) {
                            if ( name in bTarget.value ) {
                                this.pushStack( bTarget.value[name] );
                                break;
                            }
                        } else if (bTarget.type == PlStuffType.Inst) {
                            const instance = bTarget.value as PlInstance;
                            if (name in instance.value) {
                                this.pushStack(instance.value[name]);
                                break;
                            }
                        }

                        // try finding impl
                        const scrambledName = ScrambleImpl( name, bTarget );
                        const value = this.findValue( scrambledName );
                        if ( value != null ) {
                            value.value.self = bTarget;
                            this.pushStack( value );
                            break;
                        }

                        this.newProblem( {
                            "*": "RE0012",
                            "ASTCondition": "RE0016",
                        }, this.pointer, debug, name, PlStuffTypeToString( bTarget.type ) );
                        return null;
                    }

                    case PlBytecodeType.DORETN: {
                        // return value and address
                        const retVal = this.popStack();
                        const address = this.popStack();

                        // get old stack frame back
                        let outer = this.stackFrame;
                        while ( outer.trace == null ) { // reach function frame
                            outer = outer.outer;
                        }

                        this.stackFrame = outer.outer; // reach outside function frame
                        this.closureFrames.pop();

                        if ( address == null ) {
                            return retVal;
                        } else {
                            this.pointer = address.value;
                            this.stack.push( retVal );
                        }
                        break;
                    }

                    case PlBytecodeType.DOBRAK:
                    case PlBytecodeType.DOCONT: {
                        this.newProblem( "RE0009", this.pointer, debug );
                        return null;
                    }


                    case PlBytecodeType.STKENT: {
                        this.stackFrame = new PlStackFrame( this.stackFrame );
                        break;
                    }

                    case PlBytecodeType.STKEXT: {
                        this.stackFrame = this.stackFrame.outer;
                        break;
                    }

                    case PlBytecodeType.JMPREL: {
                        this.jump( +byte.value );
                        break;
                    }

                    case PlBytecodeType.JMPIFT: {
                        const peek = this.peekStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == true ) {
                                this.jump( +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, this.pointer, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    case PlBytecodeType.JMPIFF: {
                        const peek = this.peekStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == false ) {
                                this.jump( +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, this.pointer, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    case PlBytecodeType.JMPICT: {
                        const peek = this.popStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == true ) {
                                this.jump( +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, this.pointer, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    case PlBytecodeType.JMPICF: {
                        const peek = this.popStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == false ) {
                                this.jump( +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, this.pointer, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    default: {
                        this.newProblem( "RE0001", this.pointer, debug, '' + byte.type );
                        return null;
                    }
                }
                ++this.pointer;
            }

            // return Null if no exports
            return PlStuffNull;
        } catch ( e ) {
            this.newProblem( "DE0002", this.pointer, debug, '' + e );
            return null;
        }
    }
}
