import { PlBytecodeType } from "../emitter/bytecode";
import { PlDebug, PlDebugProgram, PlDebugWithin } from "../emitter/debug";
import { PlFunction, PlNativeFunction, PlStackFrame } from "./memory";
import { NewPlProblem, PlProblem } from "../../problem/problem";
import {
    NewPlStuff,
    PlStuff,
    PlStuffFalse,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeFromString,
    PlStuffTypeToString
} from "./stuff";
import {jsModules, jsNatives, natives} from "./native";
import { ScrambleFunction } from "./scrambler";
import { PlProblemCode } from "../../problem/codes";
import { PlActions, PlConverter } from "./native/converter";
import { PlProgramWithDebug } from "../emitter";
import { NewPlTraceFrame } from "../../problem/trace";
import { PlInout } from "../../inout";
import JsToPl = PlConverter.JsToPl;

const JUMP_ERRORS: Record<string, PlProblemCode> = {
    "*": "RE0010",
    "ASTCondition": "RE0014",
};

export interface StackMachine {
    findValue( key: string );

    createValue( key: string, value: PlStuff );

    setValue( key: string, value: PlStuff );

    runFunction( func: PlStuff ): PlStuff | null;

    stack: PlStuff[];
    readonly inout: PlInout;
}

export class PlStackMachine implements StackMachine {
    readonly inout: PlInout;

    stackFrame: PlStackFrame;
    closureFrames: PlStackFrame[];

    stack: PlStuff[];

    problems: PlProblem[];

    lastProgram: PlProgramWithDebug | null;

    constructor( inout: PlInout, global: Record<string, PlStuff> = {}) {
        this.inout = inout;
        this.problems = [];

        this.stackFrame = new PlStackFrame( null, NewPlTraceFrame( "file" ) );
        this.closureFrames = [];

        this.stack = [];
        this.lastProgram = null;

        this.seedFrame(global);
    }

    /// This is the worst code that i have written, it uses
    runFunction(func: PlStuff, ...args): PlStuff | null {
        if (this.lastProgram == null) {
            throw new Error("no last program somehow, did you compile the plang source code?");
        }
        const program = this.lastProgram;
        const {self, index, parameters, closure} = func.value;

        const start = index;
        const bytecode = program.program.slice(start+1);
        const debugs = [];

        // get debug
        if (program.debug) {
            for (const info of program.debug) {
                if (PlDebugWithin(info, start, program.program.length)) {
                    debugs.push( { ...info, endLine: info.endLine - index - 1 });
                }
            }
        }

        const parameterLength = parameters.length - (self == null ? 0 : 1);

        if (args.length != parameterLength) {
            throw Error("incorrect number of arguments calling the function");
        }

        const param = {};
        if (self != null) {
            param[parameters[0]] = self;
        }

        for (let i = 0; i < args.length; i++) {
            param[parameters[i + (self != null ? 1 : 0)]] = JsToPl(args[i], this.runFunction);
        }

        param[closure.trace.name] = NewPlStuff(PlStuffType.Func, {
            closure,
            parameters,
            self,
            index: -1
        } as PlFunction);

        const machine = new PlStackMachine(this.inout, param);
        machine.closureFrames.push(closure);
        const out = machine.runProgram({program: bytecode, debug: debugs});
        if (out == null) {
            const problems = machine.getProblems();
            throw new Error(problems[0].message);
        }
        return out;
    }

    seedFrame(global: Record<string, PlStuff>) {
        for ( const [ key, entry ] of Object.entries( jsNatives ) ) {
            this.stackFrame.createValue(
                key,
                PlConverter.JsToPl( entry, this.runFunction)
            );
        }

        for ( const [ key, entry ] of Object.entries( natives ) ) {
            this.stackFrame.createValue(
                key,
                NewPlStuff( PlStuffType.NFunc, {
                    callback: entry,
                    native: entry,
                } as PlNativeFunction )
            );
        }

        for (const [key, entry] of Object.entries(jsModules)) {
            this.stackFrame.createValue(
                key,
                PlConverter.JsToPl(entry, this.runFunction)
            );
        }

        for ( const [ key, entry ] of Object.entries( global ) ) {
            this.stackFrame.createValue(
                key,
                entry
            );
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

        this.problems.push( NewPlProblem( "RE0002", null, '' + line ) );
    }

    getProblems() {
        return this.problems;
    }

    getTrace() {
        const trace = [];
        if ( this.problems.length > 0 ) {
            const error = this.problems[0];
            trace.push( NewPlTraceFrame( error.code, error.info ) );
        }
        let frame = this.stackFrame;
        while ( true ) {
            if ( frame.trace != null )
                trace.push( frame.trace );
            if ( (frame = frame.outer) == null ) {
                break;
            }
        }
        return trace;
    }

    jump( ptr: number, amount: number ): number {
        if ( amount < 0 ) {
            return ptr + amount - 2; // this because i am stupid at emitting bytecode jumps
        }
        return ptr + amount;
    }

    get closureFrame() {
        return this.closureFrames[this.closureFrames.length - 1];
    }

    findValue( key: string ) {
        let value = this.stackFrame.findValue( key );
        if ( value == null && this.closureFrames.length != 0 ) {
            value = this.closureFrame.findValueDeep( key );
            if ( value != null ) {
                return value;
            }
            return this.stackFrame.findValueDeep( key );
        }
        return value;
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

    runProgram( pwd: PlProgramWithDebug ): PlStuff | null {
        /// WE ASSUME THAT THE PROGRAM IS VALID AND ONLY HANDLE RUNTIME ERRORS HERE NOT JS EXCEPTIONS
        this.lastProgram = pwd;
        const { program, debug } = pwd;
        let ptr = 0;
        try {
            while ( ptr < program.length ) {
                const byte = program[ptr];
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
                        this.pushStack( NewPlStuff( PlStuffType.Type, PlStuffTypeFromString( byte.value ) ) );
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
                            let value = this.findValue( ScrambleFunction( name, left.type ) )
                            if ( value != null ) {
                                this.pushStack( value );
                                break;
                            }
                        }

                        this.newProblem( {
                            "ASTVariable": "RE0003",
                            "ASTBinary": "RE0004",
                        }, ptr, debug, name, left ? PlStuffTypeToString( left.type ) : undefined );
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
                            index: ptr,
                        } as PlFunction ) );
                        ptr += length;
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
                        }, ptr, debug, PlStuffTypeToString( value.type ) );
                        return null;
                    }

                    case PlBytecodeType.DONEGT: {
                        const value = this.popStack();
                        if ( value.type == PlStuffType.Num ) {
                            value.value = -value.value;
                            this.pushStack( value );
                            break;
                        }
                        this.newProblem( "RE0005", ptr, debug, PlStuffTypeToString( value.type ) );
                        return null;
                    }

                    case PlBytecodeType.DOLNOT: {
                        const value = this.popStack();
                        if ( value.type == PlStuffType.Bool ) {
                            this.pushStack( value.value == true ? PlStuffFalse : PlStuffTrue );
                            break;
                        }
                        this.newProblem( "RE0017", ptr, debug, PlStuffTypeToString( value.type ) );
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
                        }

                        this.newProblem( "RE0013", ptr, debug, PlStuffTypeToString( target.type ) );
                        return null;
                    }

                    case PlBytecodeType.DOCALL: {
                        const func = this.popStack();
                        if ( func.type != PlStuffType.Func && func.type != PlStuffType.NFunc ) {
                            this.newProblem( "RE0008", ptr, debug, PlStuffTypeToString( func.type ) );
                            return null;
                        }

                        // get arguments
                        const arity = this.popStack();
                        let args = [];
                        for ( let i = 0; i < +arity.value; ++i ) {
                            args.push( PlActions.PlCopy( this.popStack() ) );
                        }
                        if ( func.value.self ) {
                            args = [ PlActions.PlCopy( func.value.self ), ...args ];
                        }

                        // get debug
                        let callDebug: PlDebug;
                        if ( debug ) {
                            callDebug = debug.filter( d => d.endLine == ptr + 1 ).pop();
                        }

                        // call function
                        switch ( func.type ) {
                            case PlStuffType.NFunc: {
                                const value = func.value as PlNativeFunction;
                                try {
                                    const out = value.callback.bind( this )( ...args );
                                    this.pushStack( out );
                                } catch ( e ) {
                                    this.newProblem( "RE0007", ptr, debug, e.message );
                                    return null;
                                }
                                break;
                            }
                            case PlStuffType.Func: {
                                const value = func.value as PlFunction;

                                const parameters = value.parameters;
                                if ( parameters.length != args.length ) {
                                    this.newProblem( "RE0006", ptr, debug, '' + parameters.length, '' + args.length );
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

                                this.pushStack( NewPlStuff( PlStuffType.Num, ptr ) ); // return address
                                ptr = value.index;
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
                        }

                        // try finding impl
                        const scrambledName = ScrambleFunction( name, bTarget.type );
                        const value = this.findValue( scrambledName );
                        if ( value != null ) {
                            value.value.self = bTarget;
                            this.pushStack( value );
                            break;
                        }

                        this.newProblem( {
                            "*": "RE0012",
                            "ASTCondition": "RE0016",
                        }, ptr, debug, name, PlStuffTypeToString( bTarget.type ) );
                        return null;
                    }

                    case PlBytecodeType.DORETN: {
                        let outer = this.stackFrame;
                        while ( outer.trace == null ) { // reach function frame
                            outer = outer.outer;
                        }

                        if ( outer.outer == null ) { // top level return
                            return this.popStack();
                        }

                        // return value and address
                        const retVal = this.popStack();
                        const address = this.popStack();
                        ptr = address.value;

                        this.stack.push( retVal );

                        // get old stack frame back
                        this.stackFrame = outer.outer; // reach outside function frame
                        this.closureFrames.pop();

                        break;
                    }

                    case PlBytecodeType.DOBRAK:
                    case PlBytecodeType.DOCONT: {
                        this.newProblem( "RE0009", ptr, debug );
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
                        ptr = this.jump( ptr, +byte.value );
                        break;
                    }

                    case PlBytecodeType.JMPIFT: {
                        const peek = this.peekStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == true ) {
                                ptr = this.jump( ptr, +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, ptr, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    case PlBytecodeType.JMPIFF: {
                        const peek = this.peekStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == false ) {
                                ptr = this.jump( ptr, +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, ptr, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    case PlBytecodeType.JMPICT: {
                        const peek = this.popStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == true ) {
                                ptr = this.jump( ptr, +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, ptr, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    case PlBytecodeType.JMPICF: {
                        const peek = this.popStack();
                        if ( peek.type == PlStuffType.Bool ) {
                            if ( peek.value == false ) {
                                ptr = this.jump( ptr, +byte.value );
                            }
                            break;
                        }
                        this.newProblem( JUMP_ERRORS, ptr, debug, PlStuffTypeToString( peek.type ) );
                        return null;
                    }

                    default: {
                        this.newProblem( "RE0001", ptr, debug, '' + byte.type );
                        return null;
                    }
                }
                ++ptr;
            }

            // return Null if no exports
            return PlStuffNull;
        } catch ( e ) {
            this.newProblem( "DE0002", ptr, debug, '' + e );
            return null;
        }
    }
}
