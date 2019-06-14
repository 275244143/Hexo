---
title: Testbench中的断言使用
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-14 10:30:16
---

### Testbench中的断言使用

Developing verification environments revolves around writing checks. We need to separate the concepts of checking the DUT from checking testbench code. DUT checks represent the "business logic" of our verification software. The code we write isn't perfect, though. Sprinkling the testbench with checks of its own helps to ensure its correctness by catching programming errors at their source.

Both *SystemVerilog* and *e* provide language constructs to reason about the DUTs behavior. In *SystemVerilog* we have the **assert**keyword, while *e* programmers use **check** in procedural code and **expect** to verify temporal behavior. These keywords are tightly integrated with EDA tools, allowing users to tag individual checks, inspect their states (for example, using an assertion browser) or annotate them to their verification plans.

If you've ever read up on *SystemVerilog*, chances are you've seen code snippets similar to this one:

```verilog
byte some_var;
assert (std::randomize(some_var) with { some_var == 1000; });
```

Checking the return value of *randomize()* is in general a good idea, because it helps us find cases where we have contradicting constraints. It's pretty clear that randomization will fail in the code snippet above, since a byte can only hold values up to *255*. The reason it fails is because we made a mistake when setting our constraint, resulting in buggy testbench code.

While we will see see an error message when executing this code, using **assert** to do implement such checks is not the way to go. This is because the *IEEE 1800-2012* LRM states that "Assertions are primarily used to validate the behavior of a **design**.". It also says that the **assert** statement is supposed to be used "to specify the property as an obligation for the **design** that is to be checked to verify that the property holds.". The fact that the randomization call was successful doesn't relate in any way to the DUT. It is purely a testbench issue, so we shouldn't be using **assert** to check it.

There are multiple problems that misusing **assert** like this will cause. First, since EDA tools interpret **assert** statements as DUT checks and track them, any such testbench checks will appear alongside "real" assertions and pollute the overview. This is more of an annoyance than a major problem. The problems come when we realize that assertions can be disabled using the *$assertoff(...)*system task. If before executing the *randomize()* call above the simulator would encounter an *$assertoff(...)*, we wouldn't get any error flagged since the check would be disabled. This means that in cases where we would expect assertion errors (like error injection or fault simulations) and would disable some DUT checks, we might accidentally disable some our testbench's checks in the process. Let's also look at what happens when we disable assertions that would pass. Consider the following code snippet:

```verilog
byte some_var;
assert (std::randomize(some_var) with { some_var == 10; });
```

This *randomize()* call will always be successful, but if we were to disable all assertions, then we'd have the nice surprise of seeing that *some_var* will remain *0*. This is because the *randomize()* doesn't get executed anymore. There was also a rumor at one point that some simulators might execute the statement, while others might not, leading to more potential for inconsistency between different vendors (as if there wasn't enough variation in *SystemVerilog* simulator implementations...). I'm not sure what the status right now is (all the ones I've tested won't execute the *randomize()* statement), but I hope this and the other reasons above convinced you that using **assert** in this way is a very bad idea.

The **assert** keyword is also part of the *e* language, where it's meant to be used to check *e* code for correct behavior (remember that the keywords to check the design for correct behavior were **check** and **expect**). *SystemVerilog* doesn't have such a language construct dedicated to checking our own code, but then again neither does *C*. In *C*, assertions are implemented using the preprocessor. Programmers include the [assert.h](https://en.wikipedia.org/wiki/Assert.h) header, which defines the *assert(...)* macro. If the expression passed as an argument to the macro fails, an error message is printed which contains the location of the error (file and line) and the program is stopped.

We can implement something similar for *SystemVerilog*. Since **assert** is already taken, I've had the not so original idea of calling our macro *uvm_assert* (for program, not progressive). If you've got a better name for it, please let me know in the comments. Our header will be called "*uvm_assert.svh"*. The macro needs to check the expression and in case of a fail, trigger a *$fatal(...)* call:

```verilog
`define uvm_assert(expr) \
  begin \
    if (!(expr)) \
      $fatal(0, $sformatf("Assertion '%s' failed.", `"expr`")); \
  end
```

The *$fatal(...)* message generated by the tool will already contain the location of the message (the file, line and scope - this is mandated by the standard). In addition to this, we can also print the expression that caused the fail. Let's see the macro in action. Let's say that we want to implement a *rectangle* class that takes the sides as constructor arguments:

```verilog
class rectangle;
  extern function new(int unsigned side0, int unsigned side1);
  // ...
endclass
```

It doesn't make any sense to pass negative numbers for their lengths, so we can enforce them to be positive by declaring them as **int unsigned**. It also doesn't make any sense to allow any of the sides to be *0*. This is something that we need to check at run time, when the constructor gets called:

```verilog
function rectangle::new(int unsigned side0, int unsigned side1);
  `uvm_assert(side0 > 0)
  `uvm_assert(side1 > 0)
  // ...
endfunction
```

This way we can ensure that the code that is instantiating a rectangle isn't buggy.

Another feature of the *C* *assert* "library" is the ability to disable checks for deployed code. The idea behind this is that while software is being developed, it has bugs. We want to be able to track down those bugs quickly when they cause an assertion to fail and fix them. Production software should (ideally) be free of bugs, so any checks we have will only slow us down without any added benefit (since we know they're all going to pass anyway). Assertions are disabled when the *NDEBUG* symbol is defined. We can have our macro work the same way:

```verilog
`ifdef NDEBUG
  `define uvm_assert(expr) \
    begin \
    end
`else
  // ...
`endif
```

When *NDEBUG* is defined before including *uvm_assert.svh*, the *uvm_assert* macro will expand to basically nothing (as compilers should be able to optimize the empty **begin...end** block away). This means that the code passed as the expression won't be seen by the compiler. This makes it interesting to look at what happens if we use *uvm_assert* with a *randomize()* call:

```verilog
byte some_var;
`uvm_assert(std::randomize(some_var) with { some_var == 10; })
$display("some_var = %0d", some_var);
```

If we simply execute this code, we won't see any error message (since the *randomize()* call can't fail) and we'll see that *some_var*got the value *10*. If however we define the *NDEBUG* symbol beforehand, we'll notice that *some_var* stays *0*. This is because the *randomize()* call never happens. This is a feature, not a bug as the *C* library also works like this. Programmers are only supposed to use expressions without any side-effects inside *assert* statements.

After a bit of research I learned that the *Unreal engine* (a big library used by a lot of video games) has some very nice assertion mechanisms in place. Aside from the *assert* style statement provided by *assert.h* (which they call *check*), it also defines two others. Most of them do basically the same thing, with some extra sugar on top. The more interesting one is called *verify* and the difference between it and *assert* is that the expression it operates on also gets executed in production builds, i.e. in cases where *assert* would expand to nothing. This is exactly the behavior we need to check the status of *randomize()*:

```verilog
`ifdef NDEBUG
  `define uvm_verify(expr) \
    begin \
      void'(expr); \
    end
`else
  `define uvm_verify(expr) \
    `uvm_assert(expr)
`endif
```

During the development stage, *uvm_verify(...)* acts just like *uvm_assert(...)* (it checks the expression and issues an error when it evaluates to false). After deployment, it merely evaluates the expression. Why do we need both macros? Wouldn't *uvm_verify(...)*suffice? Well, evaluating the expression uses up processor time, but if it doesn't have any side-effects there's no point in doing it. The safest bet would be to always use *uvm_verify(...)*, but for cases where we know that executing the expression doesn't change the state of the testbench we can gain more performance in production mode by using *uvm_assert(...)*.