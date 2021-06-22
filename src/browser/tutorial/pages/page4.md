```
say("Hello World")
```

# Input & Output

It is no fun if we were to write a program, but can't see the result. Devia allows inputs and outputs so you can interact with your program.

**ask()** opens a prompt/dialogue in the browser, and it *returns* whatever the user inputted as a Str:
```
date = ask()  # the variable date will be the user input 
```

**say(stuff)** displays the variable or value **stuff** into the output console below the editor. It *returns* null.
```
say(date)           # prints the value in the variable date
say("Hello World")  # prints the Str: Hello World
a = say("Hi")       # variable a is always null
```

### Syntax Sugar
Syntax Sugar is a programming term meaning that a new syntax introduced is really just another syntax, but the new syntax is easier and looks nicer.

It is often more mannered to attach a message when asking someone. Instead of doing that with two statements: say(message) and ask(), there is a syntax sugar:
```
date = ask("What is the date")
# is the same as
say("What is the date")
date = ask()
```

Similarly, to say multiple things at once.
```
say("Hello", "World")  
# A space is inserted between the words
# so this prints: Hello World, and not HelloWorld
```

### Challenges
1. Politely ask someone for their name, and put that Str into a variable called **name**
2. Write a program that echos the input of the user.
