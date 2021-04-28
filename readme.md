## The Plang Interpreter
The **Plang** stands for **P**rogramming **Lang**uage.

### Description
This repository houses the source code of the plang interpreter written entirely in Typescript.

The source code are all in the `src/` folder. `compiler/` contains the lexer and parser; `inout/` contains the input and output functions; `linking/` contains the linker; `problem/` contains the error printer; `repl/` contains the REPL; `vm` contains the virtual machine emitter and stack machine; `extensions/` are code that I've copied from stackoverflow.

### Examples
```
# this is a comment
```

```
# fibonacci calculator
func fib(n) {
    if n < 2 {
        return n
    }
    return fib(n - 1) + fib(n - 2)
}
# print the 12th fibonacci number
say(fib(12))
```

```
# program that asks for your name forever
loop {
    name = ask("What is your name? ")
    say("Your name is:", name)
}
```

```
# type functions
impl times(self, function) for Int {
    loop self { # loop self amount of times
        function()
    }
}

func sayHello() {
    say("Hello")
}

# print Hello 3 times
3.times(sayHello)

# or alternatively
3.times(func() {
    say("Hello")
})
```

```
# closures are supported
func makeCounter(initial) {
    @count = initial # the @ shows that we are creating a variable, not assigning to an existing one
    return func() {
        @old = count
        count = count + 1
        return old
    }
}

counter = makeCounter(1)
say(counter()) # prints 1
say(counter()) # prints 2
say(counter()) # prints 3
```

```
# Who needs classes anyways
func makeVector(x, y) {
    @data = list(x, y)
    return dict(
        get: func() {
            return data
        },
        set: func(newX, newY) {
            data = list(newX, newY)
            return data
        }
    )
}

v1 = makeVector(1, 2)
say(v1.get()) # prints 1, 2
v1.set(2, 3)
say(v1.get()) # prints 2, 3
```

### How do I use it
If you have the executable, `plang.exe <file>`
will run the file. You can also start the REPL by running `plang.exe` directly with no arguments.

If there is no executable, see the section below to build it yourself.

### How do I build it
Node 12 or higher is used to build the interpreter, but feel free to try it with a lower node version. The command `node -v` will tell you if node is installed on your machine.

Run `npm install` first to install all the dependencies, and run `npm build-cli` to make an executable in the `dist/` folder.

Other commands located in package.json are as follows
```
npm run build         ;; compiles typescript into javascript
npm run run           ;; runs the compiled javascript using node
npm run clean         ;; cleans the compiled javascript folder
npm run build-run     ;; clean, compile typescript then runs it
npm run build-browser ;; produce a AMD format single file index.js for use in a browser
```

