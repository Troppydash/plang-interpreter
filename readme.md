## The Deviation Interpreter
or Devia for shorten.

### Description
This repository houses the source code of the deviation interpreter written entirely in Typescript.

The source code are all in the `src/` folder. `compiler/` contains the lexer and parser; `inout/` contains the input and output functions; `linking/` contains the linker; `problem/` contains the error printer; `repl/` contains the REPL; `vm/` contains the virtual machine emitter and stack machine; `extensions/` are code that I've copied from stackoverflow.

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
    if name == null {
        break
    }
    say("Hello", name)
}
```

```
# type functions
impl times(self, function) for Num {
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
    count = initial
    return func() {
        old = count
        outer count = count + 1  # note we are assigning to the outer `count` variable
        return old
    }
}

counter = makeCounter(1)
say(counter()) # prints 1
say(counter()) # prints 2
say(counter()) # prints 3
```

```
# who needs classes anyways
func makeVector(x, y) {
    data = list(x, y)
    return dict(
        get: func() {
            return data
        },
        set: func(newX, newY) {
            outer data = list(newX, newY)
            return data
        }
    )
}

v1 = makeVector(1, 2)
say(v1.get()) # prints list(1, 2)
v1.set(2, 3)
say(v1.get()) # prints list(2, 3)
```

```
# using javascript inside of devia
values = list(1, 10, 20, 30)

javascript """
    const values = pl.import("values"); // import the variable "values" from devia
    function factorial(n) {
        if (n < 2) {
            return 1;
        }
        return n * factorial(n-1);
    }
    const out = [];
    for (const value of values) {
        out.push(factorial(value));
    }
    pl.export("out", out); // export the variable as "out" to devia
"""

each item, index of out {
    say("factorial", values.get(index), "=", item)
}
```

```
type Complex(real, imag)

impl +(self, other: Complex) for Complex {
    return Complex(self.real + other.real, self.imag + other.imag)
}

impl str(self) for Complex {
    return "\(self.real)+\(self.imag)"
}

c1 = Complex(1, 2)
c2 = Complex(2, 3)
say(c1 + c2)
```

### How do I use it
If you have the executable, `devia.exe <file>`
will run the file. You can also start the REPL by running `devia.exe` directly with no arguments.

If there is no executable, see the section below to build it yourself.

### How do I build it
Node 12 or higher is used to build the interpreter, but feel free to try it with a lower node version. The command `node -v` will tell you if node is installed on your machine.
pl
Run `npm install` first to install all the dependencies, and run `npm run build-cli` to make an executable in the `dist/` folder. Rename the executable for youplplplr platform to `devia.exe`. 

Other commands located in package.json are as follows
```
npm run build         ;; compiles typescript into javascript
npm run run           ;; runs the compiled javascript using node
npm run clean         ;; cleans the compiled javascript folder
npm run build-run     ;; clean, compile typescript then runs it
npm run build-browser ;; produce a AMD format single file index.js for use in a browser
```

