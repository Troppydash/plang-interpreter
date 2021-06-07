import {BytecodeTypeToString, PlBytecodeType} from "../emitter/bytecode";
import {PlDebug} from "../emitter/debug";
import {NewPlProblem, PlProblem} from "../../problem/problem";
import {
    NewPlStuff,
    PlFunction,
    PlInstance,
    PlNativeFunction,
    PlStuff,
    PlStuffFalse,
    PlStuffGetType,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeAny,
    PlStuffTypeRest,
    PlStuffTypes,
    PlStuffTypeToString,
    PlType,
} from "./stuff";
import {jsModules, jsNatives, natives} from "./native";
import {ScrambleImpl, ScrambleName} from "./scrambler";
import {PlProblemCode} from "../../problem/codes";
import {PlActions, PlConverter} from "./native/converter";
import {PlProgram} from "../emitter";
import {NewPlTraceFrame, PlTrace} from "../../problem/trace";
import {PlInout} from "../../inout";
import {PlStackFrame} from "./memory";
import {PlFile} from "../../inout/file";

// These are the jump errors
const JUMP_ERRORS: Record<string, PlProblemCode> = {
    "*": "RE0010",
    "ASTCondition": "RE0014",
};

// Custom type constructor name
export const CTOR_NAME = "new";


export interface StackMachine {
    /**
     * Find a value in the stack machine at the current state
     * @param key The name of the value
     */
    findValue(key: string);

    /**
     * Create a value in the stack machine at the current state
     * @param key The name of the new value
     * @param value The value of the new value
     */
    createValue(key: string, value: PlStuff);

    /**
     * Assign or create a value in the stack machine at the current state
     * @param key The name of the new value
     * @param value The value of the new value
     */
    setValue(key: string, value: PlStuff);

    /**
     * Run a devia function object with arguments at the current state
     * @param func The devia function object
     * @param args The arguments for the function
     * @param callPointer The location where the function is called, so that debug messages generate nicely if this is used as an callback
     */
    runFunction(func: PlStuff, args: PlStuff[], callPointer?: number): PlStuff;

    /**
     * Find a function or an impl function at the current state
     * @param name The name of the function
     * @param target The impl target
     */
    findFunction(name: string, target?: PlStuff): PlStuff | null;

    callSomething(func: PlStuff, args: PlStuff[], callDebug: PlDebug | null): boolean;
    /**
     * Save the stack machine state for try catch calls
     */
    saveState(): StackMachineState;

    /**
     * Restore the stack machine state after a catch call
     * @param state The old state of the stack machine
     */
    restoreState(state: StackMachineState);

    /**
     * Returns the traces of the stack machine, doesn't modify anything
     */
    getTrace(): PlTrace;

    /**
     * Returns the problems of the stack machine, doesn't modify anything
     */
    getProblems(): PlProblem[];



    readonly stack: PlStuff[];
    readonly problems: PlProblem[];
    readonly inout: PlInout;
    readonly stackFrame: PlStackFrame;
    readonly closureFrame: PlStackFrame;
    readonly pointer: number;
    readonly program: PlProgram;
    readonly file: PlFile;
    readonly standard: string[];
}

/**
 * The stack machine state
 */
interface StackMachineState {
    stack: PlStuff[],
    stackFrame: PlStackFrame;
    closureFrames: PlStackFrame[];
    pointer: number;
}

/**
 * Stack machine implementation
 */
export class PlStackMachine implements StackMachine {
    readonly inout: PlInout; // inout reference
    readonly file: PlFile;

    stackFrame: PlStackFrame; // The current stack frame
    closureFrames: PlStackFrame[]; // The list of closure frames, with the last being the current closure frame

    stack: PlStuff[]; // The execution stack

    problems: PlProblem[]; // Errors of the stack machine

    program: PlProgram; // The bytecode program
    pointer: number; // The machine pointer

    standard: string[];

    constructor(inout: PlInout, file: PlFile, args: string[] = []) {
        this.inout = inout;
        this.file = file;
        this.standard = [];

        this.stackFrame = new PlStackFrame(null, NewPlTraceFrame("|file|"));
        this.closureFrames = [];

        this.program = {program: [], debug: []};
        this.rearm();

        this.seedFrame(args);
    }

    // Gets the outer closure frame
    get closureFrame() {
        return this.closureFrames[this.closureFrames.length - 1];
    }

    // Adds a program into the stack machine
    addProgram(program: PlProgram, content?: string) {
        this.program.program.push(...program.program);
        this.program.debug.push(...program.debug);
        if (content)
            this.file.content += content + '\n';
    }

    // Resets the stack machine state
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

    restoreState(state: StackMachineState) {
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

    runFunction(func: PlStuff, args: PlStuff[], callPointer?: number): PlStuff {
        const oldPointer = this.pointer;
        if (callPointer) {
            this.pointer = callPointer;
        }

        // native functions
        if (func.type == PlStuffType.NFunc) {
            const out = func.value.native(...args);
            this.pointer = oldPointer;
            return out;
        }

        // check arity
        const value = func.value as PlFunction;
        const parameters = value.parameters;
        if (parameters.length != args.length) {
            this.newProblem("RE0006", this.pointer, '' + parameters.length, '' + args.length);
            this.pointer = oldPointer;
            throw null;
        }

        // push stacks
        this.closureFrames.push(value.closure);
        this.stackFrame = new PlStackFrame(this.stackFrame, value.closure.trace);

        const callDebug = this.getCallDebug(this.pointer);
        if (callDebug != null) {
            this.stackFrame.setTraceInfo(callDebug.span.info);
        }

        // parameters
        for (let i = 0; i < args.length; ++i) {
            this.createValue(parameters[i], args[i]);
        }
        this.createValue(value.closure.trace.name, func); // so we can never actually modify the function in the function

        this.pushStack(null);
        const out = this.runProgram(value.index + 1);
        this.pointer = oldPointer;

        if (out == null) {
            throw null;
        }

        return out;
    }

    /**
     * Jumps to the function to call the function, faster than runFunction but needs to be synced
     * @param func The devia function object
     * @param callDebug The debug node
     * @param args Function arguments
     */
    jumpFunction(func: PlStuff, args: PlStuff[], callDebug: PlDebug | null): boolean {
        const value = func.value as PlFunction;

        const parameters = value.parameters;
        if (parameters.length != args.length) {
            this.newProblem("RE0006", this.pointer, '' + parameters.length, '' + args.length);
            return false;
        }

        this.closureFrames.push(value.closure);
        this.stackFrame = new PlStackFrame(this.stackFrame, value.closure.trace);
        if (callDebug) {
            this.stackFrame.setTraceInfo(callDebug.span.info);
        }

        // assign variables
        for (let i = 0; i < args.length; ++i) {
            this.createValue(parameters[i], args[i]);
        }
        this.createValue(value.closure.trace.name, func); // so we can never actually modify the function

        this.pushStack(NewPlStuff(PlStuffType.Num, this.pointer)); // return address
        this.pointer = value.index;
        return true;
    }


    /**
     * Method to convert types using the Type calling
     * @param value
     * @param args
     */
    convertBasicTypes(value: PlType, args: PlStuff[]): PlStuff | null {
        if (args.length != 1) {
            this.newProblem("RE0006", this.pointer, '1', '' + args.length);
            return null;
        }
        const got = args[0];

        // Tries to find .type functions first
        const fn = this.findFunction(value.type.toLowerCase(), got);
        if (fn != null) {
            return this.runFunction(fn, [got]);
        }

        // convert to type by default
        return PlConverter.PlToPl(got, value, this);
    }

    /**
     * Takes the func and tries to call it with the arguments, returns true if successful
     * @param func
     * @param args
     * @param callDebug
     */
    callSomething(func: PlStuff, args: PlStuff[], callDebug: PlDebug | null): boolean {
        switch (func.type) {
            case PlStuffType.Type: {
                const value = func.value as PlType;
                // conversion then
                if (value.format == null) {
                    const out = this.convertBasicTypes(value, args);
                    if (out == null) {
                        return false;
                    }
                    this.pushStack(out);
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
                    if (args.length == 0) { // default value type
                        this.pushStack(instance);
                        break;
                    }
                    if (args.length == value.format.length) {
                        for (let i = 0; i < value.format.length; i++) {
                            instance.value.value[value.format[i]] = args[i];
                        }
                        this.pushStack(instance);
                        break;
                    }
                    this.newProblem("RE0006", this.pointer, `0 or ${value.format.length}`, '' + args.length);
                    return false;
                }
                // call constructor // TODO: make this a jump sometime
                try {
                    this.runFunction(ctor, [instance, ...args]); // need run function, so we can pop and push
                } catch (e) {
                    return false;
                }
                this.pushStack(instance);
                break;
            }
            case PlStuffType.NFunc: {
                const value = func.value as PlNativeFunction;
                const parameters = value.parameters;
                // check for function arity
                let hasRest = false;
                for (let i = 0; i < parameters.length; i++) {
                    const param = parameters[i];
                    if (param == PlStuffTypeRest) {
                        hasRest = true;
                        break;
                    }
                    if (i >= args.length) {
                        break;
                    }
                    if (param == PlStuffTypeAny) {
                        continue;
                    }
                    if (PlStuffTypeToString(args[i].type) != PlStuffTypeToString(param)) {
                        this.newProblem("RE0018", this.pointer, PlStuffTypeToString(param), ""+(i+1), PlStuffTypeToString(args[i].type));
                        return false;
                    }
                }
                if (!hasRest) {
                    if (args.length != value.parameters.length) {
                        this.newProblem("RE0006", this.pointer, '' + value.parameters.length, '' + args.length);
                        return false;
                    }
                }

                const stackFrame = this.stackFrame;
                try {
                    const out = value.native(...args);
                    this.pushStack(out);
                } catch (e) {
                    // insert stackFrame
                    const info = callDebug == null ? null : callDebug.span.info;
                    if (stackFrame == this.stackFrame) {
                        this.stackFrame = new PlStackFrame(this.stackFrame, NewPlTraceFrame(value.name, info));
                    } else {
                        let sf = this.stackFrame;
                        while (sf.outer != stackFrame) {
                            sf = sf.outer;
                        }
                        sf.outer = new PlStackFrame(stackFrame, NewPlTraceFrame(value.name, info))
                    }

                    if (e != null) {
                        this.newProblem("RE0007", this.pointer, e.message);
                    }
                    return false;
                }
                break;
            }
            case PlStuffType.Func: {
                if (!this.jumpFunction(func, args, callDebug))
                    return false;
                break;
            }
        }
        return true;
    }

    /**
     * Returns the call debug for the bytecode located at **pointer**
     * @param pointer Where the call bytecode is
     */
    getCallDebug(pointer: number): PlDebug | null {
        const {debug} = this.program;
        if (debug) {
            for (const d of debug) {
                if (d.endLine == pointer+1) {
                    return d;
                }
            }
            return null;
        }
        return null;
    }

    /**
     * Sets up the native and standard library methods in the global stack frame
     * @param args Program arguments
     */
    seedFrame(args: string[]) {
        // Javascript Natives
        for (const [key, entry] of Object.entries(jsNatives)) {
            entry.native = PlConverter.JsToPl(entry.native, this).value.native;
            this.stackFrame.createValue(
                key,
                NewPlStuff(
                    PlStuffType.NFunc,
                    entry
                ),
            );
            this.standard.push(key);
        }

        // Plang Natives
        for (const [key, entry] of Object.entries(natives)) {
            entry.native = entry.native.bind(this);
            this.stackFrame.createValue(
                key,
                NewPlStuff(PlStuffType.NFunc, entry)
            );
            this.standard.push(key);
        }

        // Js Modules
        for (const [moduleName, module] of Object.entries(jsModules)) {
            const obj = {};
            for (const [methodName, method] of Object.entries(module)) {
                if (typeof method != "object") {
                    obj[methodName] = PlConverter.JsToPl(method, this);
                    continue;
                }
                (method as any).native = PlConverter.JsToPl((method as any).native, this).value.native;
                obj[methodName] = NewPlStuff(PlStuffType.NFunc, method);
            }
            this.stackFrame.createValue(
                moduleName,
                NewPlStuff(PlStuffType.Dict, obj)
            );
            this.standard.push(moduleName);
        }

        // Programing arguments
        this.stackFrame.createValue(
            "process",
            PlConverter.JsToPl({
                arguments: args,
                exit: code => {
                    if (process) {
                        process.exit(code);
                    }
                    this.pointer = this.program.program.length;
                    return null;
                }
            }, this)
        );
        this.standard.push('process');


        // Basic types
        for (const key of PlStuffTypes) {
            const value = NewPlStuff(PlStuffType.Type, {
                type: key,
                format: null
            } as PlType);
            this.stackFrame.createValue(
                key,
                value
            );
            const newName = ScrambleName("new", key);
            this.stackFrame.createValue(
                newName,
                NewPlStuff(PlStuffType.NFunc, {
                    native: (...args) => {
                        const out =  this.convertBasicTypes(value.value, args);
                        if (out == null) throw null;
                        return out;
                    },
                    name: "new",
                    self: null,
                    parameters: [PlStuffTypeAny]
                } as PlNativeFunction)
            );
            this.standard.push(key, newName);
        }
    }

    /**
     * Look on the stack by **degree** amount
     * @param degree The offset
     */
    peekStack(degree: number = 0): PlStuff | null {
        const index = this.stack.length - 1 - degree;
        if (index < 0)
            return null;
        return this.stack[index];
    }

    /**
     * Put an object on top of the stack
     * @param stuff
     */
    pushStack(stuff: PlStuff) {
        this.stack.push(stuff);
    }

    /**
     * Take an object off the top of the stack
     */
    popStack(): PlStuff {
        return this.stack.pop(); // no error handling here
    }

    /**
     * Create a new problem at position **line**
     * @param code The dictionary of debugcode to problemcodes
     * @param line The bytecode line of error
     * @param args
     */
    newProblem(code: Record<string, PlProblemCode> | PlProblemCode, line: number, ...args: string[]) {
        const {debug} = this.program;
        if (!debug) {
            this.problems.push(NewPlProblem(typeof code == "string" ? code : code["*"], null, ...args));
            return null;
        }

        // get all pldebug that contains this line and the smallest one to do so
        let surrounding: PlDebug = null;
        for (const d of debug) {
            if (line < (d.endLine) && line >= (d.endLine - d.length)) {
                if (surrounding == null) {
                    surrounding = d;
                } else if (d.length < surrounding.length) {
                    surrounding = d;
                }
            }
        }

        // cannot find any debug
        if (surrounding == null) {
            this.problems.push(NewPlProblem(typeof code == "string" ? code : code["*"], null, ...args));
            return null;
        }

        // a string code
        if (typeof code == "string") {
            this.problems.push(NewPlProblem(code, surrounding.span.info, ...args));
            return null;
        }

        // finding the code that matches the name
        if (surrounding.name in code) {
            this.problems.push(NewPlProblem(code[surrounding.name], surrounding.span.info, ...args));
            return null;
        }

        // default match
        if ("*" in code) {
            this.problems.push(NewPlProblem(code["*"], surrounding.span.info, ...args));
            return null;
        }

        // no match
        throw new Error("newProblem did not find a matching code, there is a missing default case");
    }

    getProblems() {
        return this.problems;
    }

    getTrace() {
        const trace = [];
        let frame = this.stackFrame;
        while (true) {
            if (frame.trace != null)
                trace.push(frame.trace);
            if ((frame = frame.outer) == null) {
                break;
            }
        }
        // if (this.problems.length > 0) {
        //     const error = this.problems[0];
        //     trace[0].info = error.info;
        // }
        // trace.pop(); // this works because we pop the first and last trace
        return trace;
    }

    findValue(key: string): PlStuff | null {
        let value = this.stackFrame.findValue(key);
        if (value != null) {
            return value;
        }
        if (this.closureFrames.length != 0) {
            value = this.closureFrame.findValueDeep(key);
            if (value != null) {
                return value;
            }
        }
        return this.stackFrame.findValueDeep(key);
    }

    createValue(key: string, value: PlStuff) {
        return this.stackFrame.createValue(key, value);
    }

    setValue(key: string, value: PlStuff) {
        if (this.stackFrame.findValue(key) == null && this.closureFrames.length != 0 && this.closureFrame.findValueDeep(key) != null) {
            return this.closureFrame.setValue(key, value);
        }
        return this.stackFrame.setValue(key, value);
    }

    /**
     * Runs the stack machine from position **position**
     * @param position The position to start at
     */
    runProgram(position: number = this.pointer): PlStuff | null {
        /// WE ASSUME THAT THE PROGRAM IS VALID ///
        const {program} = this.program;
        this.pointer = position;

        try {
            // execution
            while (this.pointer < program.length) {
                // the larget bytecode switch
                const byte = program[this.pointer];
                switch (byte.type) {
                    // popping from stack
                    case PlBytecodeType.STKPOP: {
                        this.popStack();
                        break;
                    }
                    // defining numbers
                    case PlBytecodeType.DEFNUM: {
                        this.pushStack(NewPlStuff(PlStuffType.Num, +byte.value));
                        break;
                    }
                    // defining strings
                    case PlBytecodeType.DEFSTR: {
                        this.pushStack(NewPlStuff(PlStuffType.Str, byte.value));
                        break;
                    }
                    // defining booleans
                    case PlBytecodeType.DEFBOL: {
                        if (byte.value == '1')
                            this.pushStack(PlStuffTrue);
                        else
                            this.pushStack(PlStuffFalse);
                        break;
                    }
                    // defining null
                    case PlBytecodeType.DEFNUL: {
                        this.pushStack(PlStuffNull);
                        break;
                    }
                    // defining custom types
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
                    // defining empty null
                    case PlBytecodeType.DEFETY: {
                        this.pushStack(null);
                        break;
                    }
                    // eval variables
                    case PlBytecodeType.DEFVAR: {
                        const name = byte.value;

                        // try to find it in the stack frame
                        const value = this.findValue(name);
                        if (value != null) {
                            this.pushStack(value);
                            break;
                        }

                        return this.newProblem("RE0003", this.pointer, name);
                    }
                    // define lists
                    case PlBytecodeType.DEFLST: {
                        const length = this.popStack();
                        let values = [];
                        for (let i = 0; i < length.value; ++i) {
                            values.push(PlActions.PlCopy(this.popStack()));
                        }
                        this.pushStack(NewPlStuff(PlStuffType.List, values));
                        break;
                    }
                    // define dictionary
                    case PlBytecodeType.DEFDIC: {
                        let object = {};
                        const amount = this.popStack();
                        for (let i = 0; i < +amount.value; ++i) {
                            const key = this.popStack();
                            object[key.value] = PlActions.PlCopy(this.popStack());
                        }

                        this.pushStack(NewPlStuff(PlStuffType.Dict, object));
                        break;
                    }
                    // define functions
                    case PlBytecodeType.DEFFUN: {
                        const arity = this.popStack();
                        const parameters: string[] = [];
                        for (let i = 0; i < arity.value; ++i) {
                            parameters.push(this.popStack().value as string);
                        }
                        // block
                        const length = +byte.value;

                        this.pushStack(NewPlStuff(PlStuffType.Func, {
                            closure: new PlStackFrame(this.stackFrame, NewPlTraceFrame("|closure|")),
                            parameters,
                            index: this.pointer,
                        } as PlFunction));
                        this.pointer += length;
                        break;
                    }
                    // inc and dec
                    case PlBytecodeType.DOOINC: {
                        const value = this.popStack();
                        if (value.type == PlStuffType.Num) {
                            value.value++;
                            this.pushStack(value);
                            break;
                        }
                        return this.newProblem("RE0015", this.pointer, PlStuffGetType(value));
                    }
                    case PlBytecodeType.DOODEC: {
                        const value = this.popStack();
                        if (value.type == PlStuffType.Num) {
                            value.value--;
                            this.pushStack(value);
                            break;
                        }
                        return this.newProblem({
                            "*": "RE0015",
                            "ASTCondition": "RE0011",
                        }, this.pointer, PlStuffGetType(value));
                    }
                    // negate
                    case PlBytecodeType.DONEGT: {
                        const value = this.popStack();
                        if (value.type == PlStuffType.Num) {
                            this.pushStack(NewPlStuff(PlStuffType.Num, -value.value)); // gotta make a new object
                            break;
                        }
                        return this.newProblem("RE0005", this.pointer, PlStuffGetType(value));
                    }
                    // do not
                    case PlBytecodeType.DOLNOT: {
                        const value = this.popStack();
                        if (value.type == PlStuffType.Bool) {
                            this.pushStack(value.value == true ? PlStuffFalse : PlStuffTrue);
                            break;
                        }
                        return this.newProblem("RE0017", this.pointer, PlStuffGetType(value));
                    }
                    // do assign and create
                    case PlBytecodeType.DOCRET:
                    case PlBytecodeType.DOASGN: {
                        const name = this.popStack(); // is a string
                        const target = this.popStack();
                        const value = PlActions.PlCopy(this.popStack());

                        if (target == null) {
                            if (value.type == PlStuffType.Func) {
                                const content = value.value as PlFunction;
                                content.closure.setTraceName(name.value);
                            }
                            // set name to value
                            if (byte.type == PlBytecodeType.DOCRET) {
                                this.createValue(name.value, value);
                            } else {
                                this.setValue(name.value, value);
                            }
                            this.pushStack(value);
                            break;
                        }

                        // target is not null
                        if (target.type == PlStuffType.Dict) {
                            if (name.value in target.value) {
                                target.value[name.value] = value;
                                this.pushStack(value);
                                break;
                            }
                        } else if (target.type == PlStuffType.List) {
                            let parsed = Number.parseFloat('' + name.value);
                            if (!Number.isNaN(parsed)) {
                                parsed--;
                                if (parsed in target.value) {
                                    target.value[parsed] = value;
                                    this.pushStack(value);
                                    break;
                                }
                            }
                        } else if (target.type == PlStuffType.Inst) {
                            if (name.value in target.value.value) {
                                target.value.value[name.value] = value;
                                this.pushStack(value);
                                break;
                            }
                        }

                        return this.newProblem("RE0013", this.pointer, PlStuffGetType(target));
                    }

                    case PlBytecodeType.DOFDCL: {
                        const name = byte.value;
                        const arity = this.popStack();
                        const target = this.popStack();
                        const fn = this.findFunction(name, target);
                        if (fn == null) {
                            return this.newProblem("RE0004", this.pointer, name, PlStuffGetType(target));
                        }

                        const args = [target];
                        const remain = (+arity.value)-1;
                        for (let i = 0; i < remain; ++i) {
                            args.push(PlActions.PlCopy(this.popStack()));
                        }

                        const ok = this.callSomething(fn, args, this.getCallDebug(this.pointer));
                        if (!ok) {
                            return null;
                        }
                        break;
                    }

                    // do function call
                    case PlBytecodeType.DOCALL: {
                        const func = this.popStack();
                        if (func.type != PlStuffType.Func && func.type != PlStuffType.NFunc && func.type != PlStuffType.Type) {
                            return this.newProblem("RE0008", this.pointer, PlStuffGetType(func));
                        }

                        // get arguments
                        const arity = this.popStack();
                        const args: PlStuff[] = [];
                        if (func.value.self) {
                            args.push(func.value.self);
                        }
                        for (let i = 0; i < +arity.value; ++i) {
                            args.push(PlActions.PlCopy(this.popStack()));
                        }

                        const ok = this.callSomething(func, args, this.getCallDebug(this.pointer));
                        if (!ok) {
                            return null;
                        }
                        break;
                    }

                    // find key
                    case PlBytecodeType.DOFIND: {
                        const bKey = this.popStack();
                        const bTarget = this.popStack();

                        const name = bKey.value;
                        if (bTarget.type == PlStuffType.Dict) {
                            const value = bTarget.value[name];
                            if (value) {
                                this.pushStack(value);
                                break;
                            }
                        } else if (bTarget.type == PlStuffType.List) {
                            let parsed = Number.parseFloat('' + name);
                            if (!Number.isNaN(parsed)) {
                                parsed--;
                                const value = bTarget.value[parsed];
                                if (value) {
                                    this.pushStack(value);
                                    break;
                                }
                            }
                        } else if (bTarget.type == PlStuffType.Inst) {
                            const instance = bTarget.value as PlInstance;
                            let value = instance.value[name];
                            if (value) {
                                this.pushStack(value);
                                break;
                            }
                        } else if (bTarget.type == PlStuffType.Type) {
                            // try to find static functions
                            const value = this.findValue(ScrambleName(name, bTarget.value.type));
                            if (value != null) {
                                const fn = PlActions.PlCopy(value);
                                fn.value.self = null;
                                this.pushStack(fn);
                                break;
                            }
                        }

                        // try finding impl
                        const value = this.findValue(ScrambleImpl(name, bTarget));
                        if (value != null) {
                            const fn = PlActions.PlCopy(value);
                            fn.value.self = bTarget;
                            this.pushStack(fn);
                            break;
                        }


                        return this.newProblem({
                            "*": "RE0012",
                            "ASTCondition": "RE0016",
                        }, this.pointer, name, PlStuffGetType(bTarget));
                    }

                    // do return
                    case PlBytecodeType.DORETN: {
                        // return value and address
                        const retVal = this.popStack();
                        const address = this.popStack();

                        // get old stack frame back
                        let outer = this.stackFrame;
                        while (outer.trace == null) { // reach function frame
                            outer = outer.outer;
                        }

                        this.stackFrame = outer.outer; // reach outside function frame
                        this.closureFrames.pop();

                        if (address == null) {
                            return retVal;
                        } else {
                            this.pointer = address.value;
                            this.stack.push(retVal);
                        }
                        break;
                    }

                    // Do break and continue
                    case PlBytecodeType.DOBRAK:
                    case PlBytecodeType.DOCONT: {
                        this.newProblem("RE0009", this.pointer);
                        return null;
                    }

                    // do stack enter
                    case PlBytecodeType.STKENT: {
                        this.stackFrame = new PlStackFrame(this.stackFrame);
                        break;
                    }

                    // do stack exit
                    case PlBytecodeType.STKEXT: {
                        this.stackFrame = this.stackFrame.outer;
                        break;
                    }

                    /// do jumps ///
                    case PlBytecodeType.JMPREL: {
                        this.pointer += +byte.value;
                        break;
                    }

                    case PlBytecodeType.JMPIFT: {
                        const peek = this.peekStack();
                        if (peek.type == PlStuffType.Bool) {
                            if (peek.value == true) {
                                this.pointer += +byte.value;
                            }
                            break;
                        }
                        return this.newProblem(JUMP_ERRORS, this.pointer, PlStuffGetType(peek));
                    }

                    case PlBytecodeType.JMPIFF: {
                        const peek = this.peekStack();
                        if (peek.type == PlStuffType.Bool) {
                            if (peek.value == false) {
                                this.pointer += +byte.value;
                            }
                            break;
                        }
                        return this.newProblem(JUMP_ERRORS, this.pointer, PlStuffGetType(peek));
                    }

                    case PlBytecodeType.JMPICT: {
                        const peek = this.popStack();
                        if (peek.type == PlStuffType.Bool) {
                            if (peek.value == true) {
                                this.pointer += +byte.value;
                            }
                            break;
                        }
                        return this.newProblem(JUMP_ERRORS, this.pointer, PlStuffGetType(peek));
                    }

                    case PlBytecodeType.JMPICF: {
                        const peek = this.popStack();
                        if (peek.type == PlStuffType.Bool) {
                            if (peek.value == false) {
                                this.pointer += +byte.value;
                            }
                            break;
                        }
                        return this.newProblem(JUMP_ERRORS, this.pointer, PlStuffGetType(peek));
                    }

                    default: {
                        return this.newProblem("RE0001", this.pointer, BytecodeTypeToString(byte.type));
                    }
                }
                ++this.pointer;
            }

            // return Null if no exports
            return PlStuffNull;
        } catch (e) {
            // if anything bad happens, this will notify the user
            return this.newProblem("DE0002", this.pointer, '' + e);
        }
    }
}
