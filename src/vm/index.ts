/*

Here is the planning of the virtual machine

Compiling:
First we need to turn our ASTNode tree into simple bytecodes, one statement at a time
if in interpreting mode, and be turned into a .plb bytecode file if in compiled mode.
TD: think of a format for the .plb file in hex.

PLB format:

Executing:
The bytecodes will than be fed through an stack based virtual machine that will execute the code
Problems will be checked after running one statement, the vm will quit then.
Debug information can be included along with the bytecode or the .plb file.
The executor will need a stdin and stdout closure, and the a Paths struct,
and a list of imports to run on startup - the error of these files will be handled with a different error message,
and also native JS binding need to be passed here.

Although there will be no exception handling, a traceback will be thrown.
Objects will not be reference counted, and the js garbage collector will be fully in play here.
A stack and a heap will be made. All objects will pass by value - except for arrays and dictionaries and functions.
Scoping rules are the same with JS.


Handling Import:
View the Journal.tex document for more detailed description.
can import .plang, packages, or .plb files.


JS Interop:
syntax for calling javascript functions from plang are:

javascript.Object.entries(dict())
javascript.on(List).forEach(func(value, index) {
    print(value)
})

javascript calling plang functions will be implemented later.
a converter class or module is required to convert between pl and js types

maybe abstract this for the browser or something.


globals and lib:
native. dictionary contains exported native functions handling plang types
javascript. contains javascript functions on javascript types.

plang.exe
- lib/
will contain the standard libraries.

lib/buitlin/ will be imported at startup, and error of this will stop the program as DeveloperError.
 */


