// import {StackMachine} from "./index";
// import {PlStackFrame} from "./memory";
// import {PlFile} from "../../inout/file";
// import {PlInout} from "../../inout";
// import {PlProblem} from "../../problem/problem";
// import {EmitProgram, PlProgram} from "../emitter";
// import {PlStuff} from "./stuff";
// import {PlDebug} from "../emitter/debug";
// import PlLexer from "../../compiler/lexing";
// import {PlAstParser} from "../../compiler/parsing";
// import {ReportProblems} from "../../problem";
// import {OptimizeProgram} from "../optimizer";
// import {NewPlTraceFrame} from "../../problem/trace";
//
// function compile(region: PlRegion): [any, boolean] {
//     const lexer = new PlLexer({
//         content: region.raw,
//         filename: region.path
//     });
//     const parser = new PlAstParser(lexer);
//     let ast = parser.parseAll();
//     if (ast == null) {
//         const problems = parser.getProblems();
//         return [problems, false];
//     }
//     ast = OptimizeProgram(ast);
//
//     const program = EmitProgram(ast);
//     return [program, true];
// }
//
//
// interface PlRegion {
//     path: string;
//     raw: string;
//     offset: number;
// }
//
// function RegionPathToAbsPath(path: string): string {
//
// }
//
// function PathToRegionPath(path: string): string {
//
// }
//
// export class PlVirtualMachine {
//     readonly inout: PlInout;
//     problems: PlProblem[];
//
//     pointer: number;
//     program: PlProgram;
//     regions: Record<string, PlRegion>;
//
//     stack: PlStuff[];
//     stackFrame: PlStackFrame;
//     closureFrames: PlStackFrame[];
//     get closureFrame() {
//         return this.closureFrames[this.closureFrames.length-1];
//     }
//
//
//     constructor(inout: PlInout, file: PlFile, args: string[]) {
//         this.inout = inout;
//         this.problems = [];
//         this.pointer = 0;
//
//         this.stack = [];
//         this.stackFrame = new PlStackFrame(null, NewPlTraceFrame("|file|"));
//         this.closureFrames = [];
//
//
//     }
//
//     addProblems(problems: PlProblem[]) {
//         this.problems.push(...problems);
//     }
//
//     compileFile(file: PlFile): boolean {
//         this.inout.readFile(file.filename, )
//     }
//
//     compileRegion(region: PlRegion): boolean {
//         // compile file
//         const [result, ok] = compile(region);
//         if (!ok) {
//             this.addProblems(result);
//             return false;
//         }
//
//         // add to program
//         const {program, debug} = result;
//         this.regions[region.path] = region;
//         this.program.debug.push(...debug);
//         this.program.program.push(...program);
//
//         return true;
//     }
//
//
//
// }
