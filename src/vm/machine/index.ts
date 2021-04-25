import { PlBytecodeType } from "../emitter/bytecode";
import { PlDebug, PlDebugProgram, PlDebugWithin } from "../emitter/debug";
import { PlFunction, PlNativeFunction, PlStackFrame } from "./memory";
import { NewPlProblem, PlProblem } from "../../problem/problem";
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffToTypeString, PlStuffTrue, PlStuffType } from "./stuff";
import { natives } from "./native/native";
import { ScrambleFunction } from "./scrambler";
import { PlProblemCode } from "../../problem/codes";
import { NewFileInfo } from "../../compiler/lexing/info";
import { PlConverter } from "./native";
import { PlProgramWithDebug } from "../emitter";
import { NewPlTraceFrame } from "../../problem/trace";

export interface PlStreamInout {
    output: ( message: string ) => void;
    input: ( message: string ) => string | null;
}

export class PlStackMachine {
    readonly stream: PlStreamInout;

    stackFrame: PlStackFrame;
    stack: PlStuff[];

    debug: PlDebugProgram;
    problems: PlProblem[];

    constructor( stream: PlStreamInout ) {
        this.stream = stream;
        this.problems = [];

        this.stackFrame = new PlStackFrame( null, NewPlTraceFrame( "file" ) );
        this.stack = [];

        this.seedStack();
    }

    seedStack() {
        const native = {
            [ScrambleFunction( "output" )]: ( ...message: any ) => {
                if ( message.length == 0 ) {
                    this.stream.output( '\n' );
                } else {
                    this.stream.output( message.join( ' ' ) );
                }
                return null;
            },
            [ScrambleFunction( "input" )]: ( ...message: any ) => {
                return this.stream.input( message.join( '\n' ) );
            },
            [ScrambleFunction("panic")]: (...message: any) => {
                throw message.join(' ');
            },
            ...natives,
        };

        for ( const [ key, entry ] of Object.entries( native ) ) {
            this.stackFrame.createValue(
                key,
                PlConverter.JsToPl( entry )
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
            if ( line <= debug.endLine && line >= (debug.endLine - debug.length) ) {
                if ( surrounding == null ) {
                    surrounding = debug;
                } else if ( debug.length < surrounding.length ) {
                    surrounding = debug;
                }
            }
        }

        if ( surrounding == null ) {
            this.problems.push( NewPlProblem( "RE0002", NewFileInfo( 0, 0, 0, '' ), '' + line ) );
            return;
        }

        args = args.filter( a => a != undefined );
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

        this.problems.push( NewPlProblem( "RE0002", NewFileInfo( 0, 0, 0, '' ), '' + line ) );
    }

    getProblems() {
        return this.problems;
    }

    getTrace() {
        const trace = [];
        let frame = this.stackFrame;
        while ( true ) {
            if (frame.trace != null)
                trace.push( frame.trace );
            if ( (frame = frame.outer) == null ) {
                break;
            }
        }
        trace.reverse();
        return trace;
    }

    jump(ptr: number, amount: number): number {
        if (amount < 0) {
            return ptr + amount - 2; // this because i am stupid at emitting bytecode jumps
        }
        return ptr + amount;
    }

    runProgram( pwd: PlProgramWithDebug ): PlStuff | null {
        /// WE ASSUME THAT THE PROGRAM IS VALID AND ONLY HANDLE RUNTIME ERRORS HERE NOT JS EXCEPTIONS
        const { program, debug } = pwd;
        let ptr = 0;
        // try {
            while ( ptr < program.length ) {
                const byte = program[ptr];
                switch ( byte.type ) {
                    case PlBytecodeType.STKPOP: {
                        this.popStack();
                        break;
                    }
                    case PlBytecodeType.DEFNUM: {
                        this.pushStack( NewPlStuff( PlStuffType.NUMBER, +byte.value ) );
                        break;
                    }
                    case PlBytecodeType.DEFSTR: {
                        this.pushStack( NewPlStuff( PlStuffType.STRING, byte.value ) );
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
                        this.pushStack( NewPlStuff( PlStuffType.TYPE, byte.value ) );
                        break;
                    }
                    case PlBytecodeType.DEFETY: {
                        this.pushStack( null );
                        break;
                    }
                    case PlBytecodeType.DEFVAR: {
                        let name = byte.value;

                        // try to find it in the stack frame
                        let value = this.stackFrame.findValue( name );
                        if ( value != null ) {
                            this.pushStack( value );
                            break;
                        }

                        // attempt to add type
                        const left = this.peekStack( 1 );
                        if ( left != null ) {
                            value = this.stackFrame.findValue( ScrambleFunction( name, left.type ) )
                            if ( value != null ) {
                                this.pushStack( value );
                                break;
                            }
                        }

                        this.newProblem( {
                            "ASTVariable": "RE0003",
                            "ASTBinary": "RE0004",
                        }, ptr, debug, name, left ? PlStuffToTypeString( left.type ) : undefined );
                        return null;
                    }
                    case PlBytecodeType.DEFLST: {
                        const length = this.popStack();
                        let values = [];
                        for ( let i = 0; i < length.value; ++i ) {
                            values.push( this.popStack() );
                        }

                        this.pushStack( NewPlStuff( PlStuffType.LIST, values ) );
                        break;
                    }
                    case PlBytecodeType.DEFDIC: {
                        break;
                    }

                    case PlBytecodeType.DEFFUN: {
                        const arity = this.popStack();
                        const parameters: PlStuff[] = [];
                        for ( let i = 0; i < arity.value; ++i ) {
                            parameters.push( this.popStack() );
                        }
                        // block
                        const length = +byte.value;
                        const start = ptr + 1;
                        const end = ptr + length + 1;
                        const bytecode = program.slice( start, end );
                        const debugs = [];

                        // get debug
                        if ( debug ) {
                            for ( const info of debug ) {
                                if ( PlDebugWithin( info, start, end ) ) {
                                    debugs.push( { ...info, endLine: info.endLine - ptr - 1 } );
                                }
                            }
                        }

                        this.pushStack( NewPlStuff( PlStuffType.FUNCTION, {
                            stackFrame: null,
                            bytecode: { program: bytecode, debug: debugs },
                            parameters
                        } as PlFunction ) );
                        ptr += length;
                        break;
                    }

                    case PlBytecodeType.DOOINC:
                    case PlBytecodeType.DOODEC: {
                        const value = this.popStack();
                        if (value.type == PlStuffType.NUMBER) {
                            if (byte.type == PlBytecodeType.DOOINC)
                                value.value++;
                            else
                                value.value--;
                            this.pushStack(value);
                            break;
                        }
                        this.newProblem("RE0011", ptr, debug, PlStuffToTypeString(value.type));
                        return null;
                    }

                    case PlBytecodeType.DONEGT: {
                        const value = this.popStack();
                        if ( value.type == PlStuffType.NUMBER ) {
                            value.value = -value.value;
                            this.pushStack( value );
                            break;
                        }
                        this.newProblem( "RE0005", ptr, debug, '' + PlStuffToTypeString( value.type ) );
                        return null;
                    }

                    case PlBytecodeType.DOLNOT: {
                        break;
                    }

                    case PlBytecodeType.DOCRET:
                    case PlBytecodeType.DOASGN: {
                        const name = this.popStack(); // is a string
                        const dict = this.popStack();
                        const value = this.popStack();

                        if ( dict == null ) {
                            if ( value.type == PlStuffType.FUNCTION ) {
                                const content = value.value as PlFunction;
                                content.stackFrame.setTraceName( name.value );
                            }
                            // set name to value
                            if (byte.type == PlBytecodeType.DOCRET) {
                                this.stackFrame.createValue( name.value, value );
                            } else {
                                this.stackFrame.setValue( name.value, value );
                            }
                            break;
                        }

                        return null;
                    }

                    case PlBytecodeType.DOCALL: {
                        const func = this.popStack();
                        const arity = this.popStack();
                        const args = [];

                        // trust this
                        for ( let i = 0; i < +arity.value; ++i ) {
                            args.push( this.popStack() );
                        }

                        // get debug
                        let callDebug: PlDebug;
                        if ( debug ) {
                            // get call debug
                            callDebug = debug.filter( d => d.endLine == ptr + 1 ).pop();
                        }

                        // call function
                        switch ( func.type ) {
                            case PlStuffType.NFUNCTION: {
                                const value = func.value as PlNativeFunction;
                                try {
                                    const out = value.callback( ...args );
                                    this.pushStack( out );
                                } catch ( e ) {
                                    if ( callDebug ) {
                                        this.stackFrame = new PlStackFrame( this.stackFrame, NewPlTraceFrame( "native", callDebug.span.info ) )
                                    }
                                    this.newProblem( "RE0007", ptr, debug, '' + e );
                                    return null;
                                }
                                break;
                            }
                            case PlStuffType.FUNCTION: {
                                const value = func.value as PlFunction;
                                const parameters = value.parameters;
                                if ( parameters.length != args.length ) {
                                    this.newProblem( "RE0006", ptr, debug, '' + parameters.length, '' + args.length );
                                    return null;
                                }

                                const saved = this.stackFrame;
                                this.stackFrame = new PlStackFrame( this.stackFrame, NewPlTraceFrame( "closure" ) );
                                if ( callDebug ) {
                                    this.stackFrame.setTraceInfo( callDebug.span.info );
                                }
                                // assign variables
                                for ( let i = 0; i < args.length; ++i ) {
                                    this.stackFrame.createValue( parameters[i].value, args[i] );
                                }
                                const out = this.runProgram(value.bytecode);
                                if ( out == null ) {
                                    return null;
                                }
                                this.stackFrame = saved;
                                this.pushStack(out);
                                break;
                            }
                            default: {
                                this.newProblem("RE0008", ptr, debug, PlStuffToTypeString(func.type));
                                return null;
                            }
                        }
                        break;
                    }

                    case PlBytecodeType.DOFIND: {
                        break;
                    }

                    case PlBytecodeType.DORETN: {
                        return this.popStack();
                    }

                    case PlBytecodeType.DOBRAK:
                    case PlBytecodeType.DOCONT: {
                        this.newProblem("RE0009", ptr, debug);
                        return null;
                    }


                    case PlBytecodeType.BLOENT: {
                        this.stackFrame = new PlStackFrame(this.stackFrame);
                        break;
                    }

                    case PlBytecodeType.BLOEXT: {
                        this.stackFrame = this.stackFrame.outer;
                        break;
                    }

                    case PlBytecodeType.JMPREL: {
                        ptr = this.jump(ptr, +byte.value);
                        break;
                    }

                    case PlBytecodeType.JMPIFT: {
                        const peek = this.peekStack();
                        if (peek.type == PlStuffType.BOOLEAN) {
                            if (peek.value == true) {
                                ptr = this.jump(ptr, +byte.value);
                            }
                            break;
                        }
                        this.newProblem("RE0010", ptr, debug);
                        return null;
                    }

                    case PlBytecodeType.JMPIFF: {
                        const peek = this.peekStack();
                        if (peek.type == PlStuffType.BOOLEAN) {
                            if (peek.value == false) {
                                ptr = this.jump(ptr, +byte.value);
                            }
                            break;
                        }
                        this.newProblem("RE0010", ptr, debug);
                        return null;
                    }

                    case PlBytecodeType.JMPICT: {
                        const peek = this.popStack();
                        if (peek.type == PlStuffType.BOOLEAN) {
                            if (peek.value == true) {
                                ptr = this.jump(ptr, +byte.value);
                            }
                            break;
                        }
                        this.newProblem("RE0010", ptr, debug);
                        return null;
                    }

                    case PlBytecodeType.JMPICF: {
                        const peek = this.popStack();
                        if (peek.type == PlStuffType.BOOLEAN) {
                            if (peek.value == false) {
                                ptr = this.jump(ptr, +byte.value);
                            }
                            break;
                        }
                        this.newProblem("RE0010", ptr, debug);
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
        // } catch ( e ) {
        //     this.newProblem( "DE0002", ptr, debug, '' + e );
        //     return null;
        // }
    }
}
