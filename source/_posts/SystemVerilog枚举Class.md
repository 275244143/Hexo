---
title: SystemVerilog枚举Class
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-12 10:32:42
---

### SystemVerilog枚举Class

A well known *SystemVerilog* limitation is that the same literal cannot appear in more enumerated types within a package (or more precisely within a scope).

Let's look at a concrete example. We'll assume that we're verifying a DUT that can receive data from the outside world, perform some mathematical operations on it and sends it back. We want to model the operations that our DUT performs and the best way to do that is by using two enumerated types:

```verilog
package my_pkg;

  typedef enum { NONE, TX, RX } comm_action_t;
  typedef enum { NONE, ADD, SUB } math_action_t;
  
  // code that uses the enums
  // ...
endpackage
```

The DUT doesn't continuously crunch data, so we want to add a literal for each **enum** to represent it not doing anything. Let's use the value **NONE** (I know that for math operations the value **NOP** would have been more appropriate, but please bear with me, I'm trying to illustrate a point). As discussed above, this code won't compile, because **NONE** is declared in both types.

What I've seen people do in this case is try to uniquify the names by adding either prefixes or suffixes. I, too, plead guilty to this. For example, the **math_action_t** type would contain the value **NONE2**, in order not to clash with the **NONE** from **comm_action_t**. This solution seems clumsy to me. Not only that, but if you're trying to connect to a *VHDL* DUT one "Big Three" simulator is going to complain because the literals don't exactly match (note: *VHDL* allows the same literal to be present in multiple types).

A very naïve solution would be to define each type in its own package. In the main package we would then import both of these packages:

```verilog
package pkg1;
  typedef enum { NONE, TX, RX } comm_action_t;
endpackage

package pkg2;
  typedef enum { NONE, ADD, SUB } math_action_t;
endpackage


package my_pkg;
  import pkg1::*;
  import pkg2::*;
  
  class model;
    comm_action_t comm_action;
    math_action_t math_action;
    
    // ...
  endclass
endpackage
```

We've solved the collision problem, because each type is now defined in its own scope. We can have our cake and eat it too! Or can we? Let's see what happens if we try to use the **NONE** literal in some procedural code:

```verilog
class model;
  // ...
  
  function new();    
    comm_action = NONE;
    math_action = NONE;
  endfunction
endclass
```

Your simulator should, at this point, cowardly refuse to compile the code above, because the literal **NONE** was imported via wildcards multiple times and it's ambiguous. The correct way to do it is to qualify it with the appropriate packages:

```verilog
class model;
  // ...
  
  function new();    
    comm_action = pkg1::NONE;
    math_action = pkg2::NONE;
  endfunction
endclass
```

This solution works as well as the first one. In some respects it's more elegant, but it's also clumsier. Creating a package for each **enum** will pollute our work library. Also, when using literals in our code, the values **ADD** and **TX**, for example, can be written as-is, but we have to write **pkg1::NONE**. This isn't uniform at all. In addition, think of what would happen if we had to add a new type to a third package that doubled up the value **ADD**. We'd have to go and scope all of the existing references to **ADD** with **pkg2**.

Let's take a step back and consider another situation. What if we want to model each area of functionality separately? What I mean is, instead of creating a big **model** class that can handle everything, let's assume that we can create a clean split between the communication side and the math side. In this case, each model would be an own class. This means that each class can just embed the enumerated variable definition:

```verilog
class comm_model;
  enum { NONE, TX, RX } comm_action;
  
  // ...
endclass


class math_model;
  enum { NONE, ADD, SUB } math_action;
  
  // ...
endclass
```

Since each class represents a different scope, we don't have any problem with the definition of **NONE**. What we defined here for **comm_model**, for example, is just a variable called **comm_action** that can take any of the three values. We can use this as we would any enumerated variable. Hey, you know what else we can define inside a class? An actual type. I guess you already know why I made this little detour...

What if we mixed the two approaches and just defined each type in its own class instead of in its own package? Here's how this would look like:

```verilog
package my_pkg;
  virtual class comm_action_wrap;
    typedef enum { NONE, TX, RX } t;
  endclass
  
  virtual class math_action_wrap;
    typedef enum { NONE, ADD, SUB } t;
  endclass
  
  // ...
endpackage
```

Again, since each class is its own scope, we don't have any problem with collisions. Also, to prevent anyone from instantiating these classes, we define them virtual; their only purpose is to wrap the type definitions. If we want to use these wrapped enumerations, we have to scope them with their containing classes:

```verilog
class model;
  comm_action_wrap::t comm_action;
  math_action_wrap::t math_action;
  
  function new();
    comm_action = comm_action_wrap::NONE;
    math_action = math_action_wrap::NONE;
  endfunction
    
  // ...
endclass
```

Notice that we also need to scope the **enum** literals. This solution is more uniform, in that it treats all literals the same (we have to scope all of them). It's also better encapsulated, since we only create extra class types inside our own package. It is, of course, more verbose, but we can't getting something for nothing.

*C++* had the same problem with enumerated types, but the C++11 standard fixed that by adding a new construct, the **enum class**. This is basically the same thing as we just saw above, but it is a first class construct in the language.

I for one would like to see a similar enhancement to *SystemVerilog* in the future. What I would avoid, however, is calling it an **enum class**, as I think the word "class" carries a different connotation and would just confuse users (we anyway have the problem that the word "interface" has a double meaning). What might be practical though is to add scoping to the current construct and to allow the compiler to determine the type of a literal based on the context (à la *VHDL* or *e*). Here's what I mean:

```verilog
typedef enum { NONE, TX, RX } comm_action_t;

class some_class;
  function void do_stuff();
    comm_action_t comm_action = TX;
    // ...
    
    if (comm_action == RX) begin
      // ...
    end
  endfunction
  
  function void do_other_stuff();
    int some_int = int'(comm_action_t::NONE);
  endfunction
endclass
```

In the code snippet above, when assigning a value to **comm_action** we can just omit the scope operator, because from the context we know that the left hand side of the expression is of type **comm_action_t**, so we would expect the right hand side to be of the same type. The situation is similar for the logical operator inside the **if** statement. If however we want to do a cast, we can't figure out from the context what **enum** the value **NONE** belongs to (as it could be multiply defined), so we have to use the **::** operator. This solution would mean that code written in SV2012 could potentially be incompatible to the SV2099 version (that includes this proposal), but I would expect the occurrences of the third construct (the casting) to be far fewer than those of the first two constructs (where we can determine the type from the context).

In the meantime, our best bet is to just wrap enumerated types in virtual classes to avoid name collisions between literals.