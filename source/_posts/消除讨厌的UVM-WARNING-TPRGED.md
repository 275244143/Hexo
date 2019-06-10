---
title: ' 消除讨厌的UVM_WARNING:[TPRGED]'
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-10 11:36:54
---

### 包，类名和UVM 的前缀、后缀？

Some time ago I wrote a post that challenged some of the established coding conventions of modern *SystemVerilog*. In particular, I expressed my displeasure with the fact that all training material from EDA companies, tutorial sites and other learning resources state that packages should always contain a *"_pkg"* suffix appended to the package name and that all identifiers in the package (class/function/constant names) should contain the package name as a prefix. I attribute this to the significant *C* legacy that exists in our field, as the *C* language doesn't have any construct for packaging code.

I've started to drop the package name prefix from any new code I'm writing, both for the blog (as you might have noticed), but also at work. By seeing how this works out in "real life", I've noticed some pitfalls. The first is, of course, that people will come and complain that this doesn't satisfy the commandments given to us by the lords of *SystemVerilog*. I've yet to hear any compelling argument against dropping package names from classes. Moreover, the only arguments I've ever heard were "this isn't how everybody else is doing it" and my favorite "we've always done it this way". Until someone can come up with something better, I'll continue to believe that the much larger communities of *C++*, *Java* and other modern programming languages are onto something.

Now let's look at what happens when applying this idea when also using UVM. Normally, we'd have a package that contains a class definition. Inside this class, we'd use the utils macro to reduce the amount of boilerplate code needed to make it a productive member of a UVM environment:

```verilog
package some_package;
  // ...

  class some_class extends uvm_object;
    // ...

    `uvm_object_utils(some_class)
  endclass

endpackage
```

If we'd try to print an object of this class, we'd get something like this:

```verilog
---------------------------------
Name      Type        Size  Value
---------------------------------
some_obj  some_class  -     @338
---------------------------------
```

The type column would rightly show *some_class*, but that isn't very informative, as some colleague pointed out. Having the package name as a prefix made it instantly possible to identify the scope where the class is defined. This is particularly helpful when classes from different packages use the same name.

And speaking of using the same name for multiple classes... Let's say that we also have another package that defines a *some_class*type:

```verilog
package some_other_package;
  // ...

  class some_class extends uvm_object;
    // ...

    `uvm_object_utils(some_class)
  endclass

endpackage
```

Because the classes have the same name, when they get registered with the factory, we'll get the following warning:

```verilog
UVM_WARNING @ 0: reporter [TPRGED] Type name 'some_class' already registered with factory. No string-based lookup support for multiple types with the same type name.
```

Aside from disabling the *set_\*_override_by_name(...)* functions (which I anyway wouldn't recommend using), it doesn't do anything else. Everything else still works just fine. Nevertheless, extra warning message aren't nice, because they clutter the log file. For one or two classes it might be ok, but try working with multiple UVC packages that each define a *driver*, *monitor*, *agent*, etc. class... I tried to come up with a way to disable the warning, but I wasn't successful.

I've thought about these problems on multiple occasions, went down a few dead ends and dreamt up some silly solutions. I kept thinking that the problem was with UVM, that the macros were to restrictive because they don't consider the class's parent package. Then I realized that the name that gets displayed by the *print(...)* function and that gets registered with the factory is merely the one supplied as the macro argument. Instead of using just the class name, we can just as well use its fully qualified name, that includes the package name and the scope operator, *"::"*. This means we can change our code to this:

```verilog
  class some_class extends uvm_object;
    // ...

    `uvm_object_utils(some_package::some_class)
  endclass
```

Now we won't get any more warning from the UVM factory and the text displayed by *print(...)* will make it clear which class we're dealing with:

```verilog
-----------------------------------------------
Name      Type                      Size  Value
-----------------------------------------------
some_obj  some_package::some_class  -     @338
-----------------------------------------------
```

With this small tweak, it's possible to drop the package prefix from classes while still getting nice prints in UVM and avoiding any warnings from the factory. Now we have two reasons less against shortening our class names.