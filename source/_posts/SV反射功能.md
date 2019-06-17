---
title: SV反射功能
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-17 10:18:48
password: 2101114
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### SV反射功能

#### 实现1

[Reflection](https://en.wikipedia.org/wiki/Reflection_%28computer_programming%29) is a mechanism that allows "inspection of classes, interfaces, fields and methods at runtime without knowing the names of the interfaces, fields, methods at compile time. It also allows instantiation of new objects and invocation of methods". In *e*, using reflection together with **define as compute** macros allows us to do some really cool stuff.

A major complaint about *SystemVerilog* is that it lacks reflection capabilities. These could be useful for writing super generic code,but the main use I can see, though, is in testing. For example, in *Java*, the JUnit framework decides which methods to execute as unit tests based on annotations (*@Test*). Reflection could also allow a user to write some very generic checks, for example checking that after a method call the *rand_mode()* attribute of all variables of an object is set to 0. Mocking frameworks also use a lot of reflection to do their thing (I hear), though I don't really know the exact details.

*Verilog* and *SystemVerilog* provide the *Verilog Programming Interface* (VPI), which the IEEE 1800-2012 standard describes as a part of the "procedural interface that allows foreign language functions to access the internal data structures of a SystemVerilog simulation". It is defined as a *C* programming language interface to be used for writing *C* applications. Unfortunately, these functions aren't directly available in a *SystemVerilog* package. I've no idea why, since this is pretty low hanging fruit. (This isn't 100% true, since it is possible to use the VPI to "enhance" the simulator by defining new system tasks and functions, but the process is very cumbersome.)

I've used the VPI for some past projects. It's written in an object oriented style, but since it's plain old *C* code it doesn't have the same feel as a proper OOP language. This makes it not quite so comfortable to use. It is pretty powerful, though, and it allows a developer to mine a lot of information out of the compiled *SystemVerilog* code. On the other side of the HVL barricade, *e*'s reflection API is excellent. It's every bit as powerful and very comfortable to use, making it a worthy reference.

Our goal in this post is to define a reflection API for *SystemVerilog*. Anything we develop should have a nice object oriented interface, with classes to model each language construct (i.e. variables, functions, tasks, classes, etc.). The most reasonable (and only) course of action is to leverage the existing VPI, by building an adaption layer.

The first thing we need to do is to find a way to access the VPI routines which are available in *C* from code written in *SystemVerilog*. Fortunately, this is possible via the *Direct Programming Interface* (DPI), which allows us to call code written in other programming languages. The interface to *C* code (called DPI-C) is thoroughly defined in the standard. We can use it write a package that imports the VPI functions into *SystemVerilog*. Apparently Dave Rich already beat me to the punch here (by a couple of years judging from the code comments), with his DVCon 2016 paper, *Introspection into SystemVerilog without Turning It Inside Out*, where he presents this exact idea.

The VPI is fully documented in Annexes K, L and M of the IEEE 1800-2012 standard. These sections contain the header files that simulators must provide for VPI applications to include. In this post we're mostly interested in the parts related to classes and variables. For the next sections, I'll assume that readers are already familiar with the VPI. If you're new to the topic, you should give Sections 36, 37 (especially) and 38 of the LRM a quick read before you continue.

The first step is to mirror the type definitions on the *C* side into *SystemVerilog*. The DPI-C allows defines a rich set of equivalent type mappings from one language to the other, so this step is pretty straightforward:

```verilog
typedef int PLI_INT32;
typedef longint PLI_INT64;
typedef chandle vpiHandle;
```

The basic thing we can do with a *vpiHandle* is to get certain properties it has. The properties simulation objects can have are defined in the VPI headers and also need to be mirrored into *SystemVerilog*:

```verilog
parameter vpiUndefined = -1;
parameter vpiType = 1;
parameter vpiName = 2;

parameter vpiRandType = 610;
parameter vpiNotRand = 1;
parameter vpiRand = 2;
parameter vpiRandC = 3;
```

I've used parameters inside the package for them, but they could just as well have been constants. I'm not really sure what would have been better here (though now on second glance I'm leaning toward constants), so if you have some input here, I'd love to hear it.

Simulation objects are typically "connected" to each other via references. To traverse one-to-one relationships (e.g. a class has a class definition), we need to define the corresponding object types:

```verilog
parameter vpiModule = 32;
parameter vpiPackage = 600;
parameter vpiClassDefn = 652;
```

It can also be the case that one simulation objects contains references to multiple other simulation objects of the same type (e.g. a class definition contains multiple variables). For traversing one-to-many relationships we need to define the appropriate values to pass to *vpi_iterate(...)*:

```verilog
parameter vpiVariables = 100;
```

Once we've set up our types and our other constants, we can import the VPI functions using the DPI-C:

```verilog
import "DPI-C" context
  function PLI_INT32 vpi_get(PLI_INT32 prop, vpiHandle obj);

import "DPI-C" context
  function PLI_INT64 vpi_get64(PLI_INT32 prop, vpiHandle obj);

import "DPI-C" context
  function string vpi_get_str(PLI_INT32 prop, vpiHandle obj);

import "DPI-C" context
  function vpiHandle vpi_iterate(PLI_INT32 type_, vpiHandle ref_);

import "DPI-C" context
  function vpiHandle vpi_handle(PLI_INT32 type_, vpiHandle ref_);

import "DPI-C" context
  function vpiHandle vpi_scan(vpiHandle itr);
```

I've tried to use the same names for the arguments as in the LRM, but some of them are *SystemVerilog* keywords. In these cases I added an underscore as a suffix.

This didn't work directly when trying to compile the code. The *SystemVerilog* compiler complained that it couldn't find the *vpi_\*(...)* functions anywhere. I guess this has something to do with the fact that when compiling it doesn't link the VPI binaries. What I tried to do is to define a dummy *C* file that just includes the VPI header:

```verilog
#include "vpi_user.h"
```

I hope that this way I could force the linking to happen. This didn't really help. I think this is because, since we don't use any of the functions declared in the header, the *C* compiler assumes that we don't need them at all. After some searching online, I tried to find out if it's possible to force the compiler/linker to link unused symbols. This is what my search pointed me to:

```verilog
PLI_BYTE8* (*vpi_get_str__)(PLI_INT32, vpiHandle) = &vpi_get_str;
```

I'm not a *C* expert, so don't quote me on this, but I think the code above should declare a function pointer with the respective return and argument types called *vpi_get_str__(...)* that points to the original *vpi_get(...)* function. Then, in our import code, instead of importing *vpi_get_str(...)*, we would import *vpi_get_str__(...)*. This also didn't work.

The only thing that did work was to define *vpi_get_str__(...)* as a wrapper function that calls the real *vpi_get_str(...)*:

```verilog
PLI_BYTE8* vpi_get_str__(PLI_INT32 prop, vpiHandle obj) {
  return vpi_get_str(prop, obj);
}
```

After doing this for the other functions as well, I ended up with the following DPI-C imports:

```verilog
import "DPI-C" context vpi_get__ =
  function PLI_INT32 vpi_get(PLI_INT32 prop, vpiHandle obj);

import "DPI-C" context vpi_get64__ =
  function PLI_INT64 vpi_get64(PLI_INT32 prop, vpiHandle obj);

import "DPI-C" context vpi_get_str__ =
  function string vpi_get_str(PLI_INT32 prop, vpiHandle obj);

import "DPI-C" context vpi_iterate__ =
  function vpiHandle vpi_iterate(PLI_INT32 type_, vpiHandle ref_);

import "DPI-C" context function vpiHandle vpi_handle(PLI_INT32 type_,
  vpiHandle ref_);

import "DPI-C" context vpi_scan__ =
  function vpiHandle vpi_scan(vpiHandle itr);
```

Instead of importing the original *vpi_\*(...)* functions I imported the wrappers, which worked perfectly. I guess this is because the *C*compiler was happy when it saw the VPI functions getting used. While writing the post, though, I noticed that I didn't do this for *vpi_handle(...)*, which I imported directly. This whole process of writing wrappers and importing them is pretty tedious, so if anyone has any idea what's going on here and how the imports could be streamlined, I'd very much appreciate it.

Implementation aspects aside, it's time to see the package in action:

```verilog
module test;
  import vpi::*;

  initial begin
    automatic chandle mod_it = vpi_iterate(vpiModule, null);

    automatic chandle root = vpi_scan(mod_it);
    $display("root = %d", root);
    $display("  type = %s", vpi_get_str(vpiType, root));
    $display("  name = %s", vpi_get_str(vpiName, root));

    if (vpi_scan(mod_it) == null)
      $display("no more top modules");
  end
endmodule
```

The code above is going to figure out that the root module is called *test* and tells us that there are no more root modules. This isn't particularly impressive, but the important thing to note is that it's written exclusively in *SystemVerilog*.

Now that we've got the power of the VPI at our fingertips, it's time to start thinking about how to implement our reflection API. All reflection operations in *e* are handled by the *rf_manager* **struct**. This is as good a name as any other for the top level entity that I can think of at the moment. We want our *rf_manager* to be able to give us an object that contains all of the information about a certain class. This object will be of type *rf_class*. As a first step, we want to get the corresponding *rf_class* object based on the class name:

```verilog
class rf_manager;
  extern static function rf_class get_class_by_name(string name);
endclass
```

The *get_class_by_name(...)* method needs to look into our compiled library and check if it can find the definition of a class with the supplied name. This is done by traversing the VPI object model:

```verilog
function rf_class rf_manager::get_class_by_name(string name);
  vpiHandle package_it = vpi_iterate(vpiPackage, null);

  while (1) begin
    vpiHandle package_ = vpi_scan(package_it);
    vpiHandle classdefn_it;

    if (package_ == null)
      break;
    classdefn_it = vpi_iterate(vpiClassDefn, package_);
    if (classdefn_it == null)
      continue;

    while (1) begin
      vpiHandle classdefn = vpi_scan(classdefn_it);
      if (classdefn == null)
        break;
      if (vpi_get_str(vpiName, classdefn) == name) begin
        rf_class c = new(classdefn);
        return c;
      end
    end
  end
endfunction
```

The code above has some limitations. It only works for classes defined in packages and if the class name is used in multiple packages, it's going to stop at the first one it finds. This is something that's going to get fixed later, but now we're at the proof-of-concept phase.

I've made the *get_class_by_name(...)* static inside *rf_manager*, but a better idea might have been to make *rf_manager* a singleton and leave the function non-static. This way I could later implement state inside the class, which would be useful, for example, to cache calls to reflection methods (since I'm assuming VPI calls don't come cheap). I'm curious what you're thoughts are here.

What could we want to know about a class? For starters, we'd like to know its name and what variables are declared inside it:

```verilog
class rf_class;
  extern function string get_name();
  extern function array_of_rf_variable get_variables();
  extern function rf_variable get_variable_by_name(string name);

  extern function new(vpiHandle classDefn);
endclass
```

We can get all of this information by traversing the VPI object model of the class definition, which is defined in Section 37.29 of the LRM:

```verilog
function string rf_class::get_name();
  return vpi_get_str(vpiName, classDefn);
endfunction


function array_of_rf_variable rf_class::get_variables();
  rf_variable vars[$];
  vpiHandle variables_it = vpi_iterate(vpiVariables, classDefn);
  while (1) begin
    rf_variable v;
    vpiHandle variable = vpi_scan(variables_it);
    if (variable == null)
      break;
    v = new(variable);
    vars.push_back(v);
  end
  return vars;
endfunction


function rf_variable rf_class::get_variable_by_name(string name);
  vpiHandle variables_it = vpi_iterate(vpiVariables, classDefn);
  while (1) begin
    vpiHandle variable = vpi_scan(variables_it);
    if (variable == null)
      break;
    if (vpi_get_str(vpiName, variable) == name) begin
      rf_variable v = new(variable);
      return v;
    end
  end
endfunction
```

Once we have an object of type *rf_variable*, we can get its name or we can ask it whether it is a random or a state variable and if it is random, whether it is **rand** or **randc**:

```verilog
class rf_variable;
  extern function string get_name();
  extern function bit is_rand();
  extern function rand_type_e get_rand_type();
  extern function new(vpiHandle variable);
endclass
```

And just as before, this information can be found by traversing the VPI object model, in this case the one defined in Section 37.17:

```verilog
function string rf_variable::get_name();
  return vpi_get_str(vpiName, variable);
endfunction

function bit rf_variable::is_rand();
  return get_rand_type() != NOT_RAND;
endfunction

function rand_type_e rf_variable::get_rand_type();
  PLI_INT32 rand_type = vpi_get(vpiRandType, variable);
  case (rand_type)
    vpiNotRand : return NOT_RAND;
    vpiRand : return RAND;
    vpiRandC : return RANDC;
    default : $fatal(0, "Internal error");
  endcase
endfunction
```

As you can see, once we know what information we want to extract, getting it is just a matter of consulting the VPI object models and performing the required traversal operations. Since this is a pretty laborious task, having a cleaner API based on object orientation can certainly help make things more usable.

Let's look at a simple example of the reflection API in action. Let's take a simple class definition:

```verilog
package some_package;

  class some_class;
    int some_variable;
    rand int some_rand_variable;
  endclass

endpackage
```

Using the reflection API, we're able to print the random type of *some_rand_variable:*

```verilog
module test;
  import reflection::*;
  import some_package::*;

  initial begin
    automatic rf_class rf_some_class =
      rf_manager::get_class_by_name("some_class");
    automatic rf_variable rf_some_rand_variable =
      rf_some_class.get_variable_by_name("some_rand_variable");

    rf_some_rand_variable.print();
  end
endmodule
```

We've been calling our new package a reflection API, but what we've implemented so far is just introspection of the code structure (i.e. compile time aspects). Aside from implementing all relevant queries, to truly say that we've implemented introspection, we have to be able to get the values of variables from different objects (i.e. run time aspects). Once we have this, we'll be able to officially claim that we've implemented reflection when we're also able to set variable values. These steps will be coming soon, so stay tuned.

#### 实现2

In the previous post we saw that it's possible to use the Verilog Programming Interface (VPI) to programmatically get information about classes. For example, we can "ask" a class what variables it has. We've wrapped the calls to the C interface in a nice SystemVerilog library by using the Direct Programming Interface (DPI). While being able to mine the code for information about its structure can prove very useful, what this gives use is merely introspection. True reflection requires that we're able to manipulate values stored inside objects, by getting or setting them.

As a template on how this part of the API should look, we're going to take a peek at how Java handles reflection. The first thing to note is that in Java everything is a class (kind of). All classes extend the Object class implicitly. Even primitive types, such as int and char, are wrapped in classes (i.e. Int and Char, respectively). The primitive types and their class wrappers are also pretty much interchangeable via the mechanisms of autoboxing and unboxing.

The java.lang.reflect.Field class (the counterpart to our rf_variable class) contains a set(...) method that allows it to change the value of the respective field for a given object instance. Since everything is an Object, the signature for this method is:

```java
public class Field {
  public void set(Object obj, Object value) {
    // ...
  }

  // ...
}
```

Things aren't as easy in SystemVerilog. There isn't any root class from which all other classes branch out. There's also a clear separation between primitive types and classes. We're going to have to find a way to get around this.

Let's first look at what we can do about the obj argument of the aforementioned function. Since we don't have a built-in Object class, we're going to have to define our own. Our set(...) function will accept an instance of a class called rf_object_instance_base. This class will store a handle to the object as it is returned by the VPI (more details on this in a bit). We need to (somehow) pass references to objects of different types down to the VPI layer. These objects don't have any lowest common denominator, in the form of a common base class.

We have a similar problem with the value argument. Our set(...) function could take an object of a container class, rf_value_base, which stores the value in an "abstract" way. The problem here is compounded by the fact that values can be any SystemVerilog type, built-in or user defined.

Based on the discussion above, we can enhance the rf_variable class to contain the following function:

```verilog
class rf_variable;
  function void set(rf_object_instance_base object, rf_value_base value);

  // ...
endclass
```

Now it's time to take this fuzzy idea and put it into practice. Let's start with the container for object instances. To be able to manipulate an object via the VPI, we need to know how to access it via a vpiHandle. The type of the object isn't really that important. The rf_object_instance_base class only needs to store this handle:

```verilog
virtual class rf_object_instance_base;
  protected vpiHandle class_obj;

  function vpiHandle get_class_obj();
    return class_obj;
  endfunction
endclass
```

The difficult part is being able to get this handle from objects of different types. To do this without violating the language syntax we'll have to use a parameterized class, rf_object_instance #(...), which takes the object type as a parameter. This parameterized class only exists to make the compiler happy. It traverses the VPI model to find the vpiHandle of the object passed to its get(...) function:

```verilog
class rf_object_instance #(type T = int) extends rf_object_instance_base;
  static function rf_object_instance #(T) get(T object);
    vpiHandle obj;
    // set 'obj' using the VPI
    get = new(obj);
    return get;
  endfunction

  protected function new(vpiHandle class_obj);
    this.class_obj = class_obj;
  endfunction
endclass
```

The exact steps required to do the traversal aren't important for this discussion. One very important thing I learned after quite a bit of digging is that it's very very very important to make sure that any simulator optimizations get turned off when trying to work with objects. Normally, for signals and variables the simulator will tell you when you're trying to perform an illegal operation (such as reading a signal that doesn't have read access). When trying to traverse class object relationships, you might not get any such messages. The exact symptom I was seeing was that I was getting a null vpiHandle for an existing object. I've added some sanity checks inside the traversal code to check for this situation, but there may be more pitfalls that I haven't covered.

Here's an example how we can get the instance container for an object:

rf_object_instance_base o = rf_object_instance #(some_class)::get(some_obj);
We can implement the same pattern to deal with values. As before, we need a base class. In this case, this base class doesn't need to do anything, except sit there and look pretty for the compiler:

```verilog
virtual class rf_value_base;
endclass
```

When we want to manipulate a concrete value, we can use a parameterized class, rf_value #(...). For those of you familiar with e's reflection capabilities, this concept is similar to using the rf_value_holder struct, together with the unsafe() operator. The parameterized class is going to do the heavy lifting:

```verilog
class rf_value #(type T = int) extends rf_value_base;
  local T value;
  local static T def_value;

  function new(T value = def_value);
    this.value = value;
  endfunction

  function T get();
    return value;
  endfunction

  function void set(T value);
    this.value = value;
  endfunction
endclass
```

The value stored in it can be set using the constructor:

```verilog
rf_value #(int) v = new(5);
```

Notice, though, that the get(...) and set(...) functions only exist in the parameterized class. This means that the rf_variable class, which is going to use the value passed to it, needs to cast the container to it's appropriate type.

Before we dive into the implementation of rf_variable::set(...), we need a bit of background information. Getting and setting values is handled in a different way by the VPI than getting handles to simulation objects. Without turning this post into a VPI tutorial, let's have a quick look at how this is done. There are two functions: vpi_get_value(...) and vpi_put_value(...). The prototype for vpi_get_value(...) is:

void vpi_get_value(vpiHandle obj, p_vpi_value value_p);
The obj argument is a handle to the simulation object (signal or variable) that's being interrogated and p is a pointer to a structure in which to store the value information. The type definition for this p_vpi_value struct is:

```verilog
typedef struct t_vpi_value {
  PLI_INT32 format;
  union {
    PLI_BYTE8 *str;
    PLI_INT32 scalar;
    PLI_INT32 integer;
    double real;
    struct t_vpi_time *time;
    struct t_vpi_vecval *vector;
    struct t_vpi_strengthval *strength;
    PLI_BYTE8 *misc;
  } value;
} s_vpi_value, *p_vpi_value;
```

This data type allows all kinds of values to be described. The exact contents of this structure and how they're supposed to be used aren't important. What is important to note is that passing this information across the language boundary (between C and SystemVerilog) isn't going to be easy. First of all, this C structure just can't be translated into an equivalent SystemVerilog representation, because the latter doesn't have any concept of pointers. Secondly, even if we didn't have the problem with pointers, most simulators are only going to support primitive types in DPI declarations (even though the standard allows for more complicated aggregate types).

Since we can't work with any kind of value in a generic fashion, we're going to have the break the problem down. If we can't import the vpi_get_value(...) function directly, we can at least import a stripped down version of it that can only get integer values:

```verilog
int vpi_get_value_int(vpiHandle obj) {
  s_vpi_value v;
  v.format = vpiIntVal;
  vpi_get_value(obj, &v);
  return v.value.integer;
}
We can do the same for its set(...) counterpart:

void vpi_put_value_int(vpiHandle obj, int value) {
  s_vpi_value v;
  v.format = vpiIntVal;
  v.value.integer = value;
  vpi_put_value(obj, &v, NULL, vpiNoDelay);
}
```

Since these functions only use primitive types for their arguments and return values, we can import them using the DPI:

```verilog
import "DPI-C" context
  function int vpi_get_value_int(vpiHandle obj);

import "DPI-C" context
  function void vpi_put_value_int(vpiHandle obj, int value);
```

After this long detour, let's get back to the task at hand. Because we'll have multiple variants of the get_*(...) and put_*(...) functions in the VPI layer, the rf_variable class needs to know which one of them to call, based on the type of variable we're operating on. Since we can only operate on integers at the moment, let's limit the discussion to this type.

The only way I can currently envision implementing this is by writing a big case statement, which dispatches different functions depending on the variable's type:

```verilog
function void rf_variable::set(rf_object_instance_base object, rf_value_base value);
  vpiHandle var_ = get_var(object);
  case (vpi_get_str(vpiType, var_))
    "vpiIntVar" : set_value_int(var_, value);
    default : $fatal(0, "Type '%s' not implemented", vpi_get_str(vpiType,
      var_));
  endcase
endfunction
```

The case is quite boring now, but you get the idea. We'd add a new item of each type we want to support. User defined types are for sure going to be a blast to implement...

The get_var(...) function traverses the VPI model to get the handle for the chosen variable inside the given object instance. It's implementation isn't that important for this discussion. More interesting is the set_value_int(...) function:

```verilog
class rf_variable;
  local function void set_value_int(vpiHandle var_, rf_value_base value);
    rf_value #(int) val;
    if (!$cast(val, value))
      $fatal(0, "Internal error");
    vpi_put_value_int(var_, val.get());
  endfunction

  // ...
endclass
```

As we saw above, to be able to access the value stored in the container, we need to cast it to its parameterization. Afterwards we can get use this value as an argument to vpi_put_value(...).

Getting the value of an object's variable can be done in the same way:

```verilog
function rf_value_base rf_variable::get(rf_object_instance_base object);
  vpiHandle var_ = get_var(object);
  case (vpi_get_str(vpiType, var_))
    "vpiIntVar" : return get_value_int(var_);
    default : $fatal(0, "Type '%s' not implemented", vpi_get_str(vpiType,
      var_));
  endcase
endfunction
Here, the get_value_int(...) gets the value via the VPI:

class rf_variable;
  local function rf_value_base get_value_int(vpiHandle var_);
    rf_value #(int) ret = new();
    ret.set(vpi_get_value_int(var_));
    return ret;
  endfunction

  // ...
endclass
```

Using these two functions, it's possible to manipulate and interrogate the values of class variables using reflection:

```verilog
rf_value #(int) v = new(5);
some_var.set(rf_object_instance #(some_class)::get(some_obj), v);
void'(!$cast(v, some_var.set(rf_object_instance #(some_class)::get(some_obj)));
```

I'm not particularly thrilled by having to implement a new pair of get_value_*(...)/set_value_*(...) functions for each new type that we want to support, but at least this is an internal implementation detail that doesn't affect the API. It can always be changed if something better comes along. Using a case statement and casting are also frowned upon in the OOP community, because they can usually be avoided by using polymorphism. If anyone has a cleaner implementation, this is also something that can be changed without making any modifications to the API.

#### 实现3

We've already looked at how to interrogate classes about what variables they have and how to set and get the values of these variables in different instances. Classes are much more than just data containers, though. They also contain methods that can operate on their variables. In this post we'll look at how we can handle tasks and functions inside our reflection API.

Before we start, however, let's take a quick look at the two kinds of methods we can declare in SystemVerilog: tasks and functions. Both allow the caller to pass information to the method via arguments. Functions can also return a value when the call is finished, but must do this without consuming any simulation time. Tasks can, on the other hand, advance time, but they can't return anything.

Because both have some similarities, it makes sense to model them using a common class, rf_method. This class will handle queries regarding a method's arguments:

```verilog
virtual class rf_method;
  extern function string get_name();
  extern function method_kind_e get_kind();

  extern function array_of_rf_io_declaration get_io_declarations();
  extern function rf_io_declaration get_io_declaration_by_name(string name);

  // ...
endclass
```

The VPI section of the standard uses the term "IO declaration" for a method's arguments. This is because, as for module and interface ports, an argument can be an input, an output or an inout. We'll need another class to handle IO declaration:

```verilog
class rf_io_declaration;
  extern function string get_name();
  extern function string get_type();
  extern function io_direction_e get_direction();

  // ...
endclass
```

Given a vpiHandle that points to an IO declaration, it's easy to extract its direction:

```verilog
typedef enum { INPUT, OUTPUT, INOUT } io_direction_e;

function io_direction_e rf_io_declaration::get_direction();
  case (vpi_get(vpiDirection, io_declaration))
    vpiInput : return INPUT;
    vpiOutput : return OUTPUT;
    vpiInout : return INOUT;
    default : $fatal(0, "Direction %s not supported", vpi_get_str(vpiDirection,
      io_declaration));
  endcase
endfunction
```

To extract the type of an IO declaration, we can treat it as any normal variable. This means that we can use the rf_variable class's get_type() function to provide us with this information:

```verilog
function string rf_io_declaration::get_type();
  rf_variable v = new(vpi_handle(vpiExpr, io_declaration));
  return v.get_type();
endfunction
```

Looping over a method's IO declaration is done in basically the same way as when going through variables, so we'll skip over that code.

Now that we've handle the similarities between tasks and functions, it's time to look at their differences. In terms of properties we can express through code, tasks don't provide anything more. This means that the rf_task class doesn't have to do anything special:

```verilog
class rf_task extends rf_method;
  function new(vpiHandle method);
    super.new(method);
  endfunction
endclass
```

We'll still define this class, because the rf_method class is virtual (meaning that we don't want to instantiate it directly). It also makes our API future-proof, if anything is added to tasks later.

Functions have a return type, which we would like to be able to interrogate. The rf_function class let's us do this:

```verilog
class rf_function extends rf_method;
  extern function string get_return_type();

  // ...
endclass
```

As for method arguments, we can treat the return of a function as a variable and use the rf_variable class to get its type:

```verilog
function string rf_function::get_return_type();
  vpiHandle r = vpi_handle(vpiReturn, method);
  rf_variable v;
  if (r == null)
    return "void";
  v = new(r);
  return v.get_type();
endfunction
```

These were the basic things we could extract about tasks and functions. Other interesting properties would be whether they are local, protected or public, whether they are virtual and so on, but we won't look at this here. These could be added to rf_method later.

As we said when we talked about variables, being able to interrogate the structure of declared methods only means that we've implemented introspection. Full reflection in this respect requires us to be able to call the methods of any object. Unfortunately, I couldn't find anything in the VPI chapter about how to do this, so it it seems that this might not be possible. Oh well, we were bound to be disappointed eventually...

Even though it's not possible to call functions, I can imagine how this could have been implemented. For a certain function handle (and by this I mean a vpiHandle) obtained from within an object we could set the contents of its input and inout arguments to our desired values via calls to vpi_set_value(...). Afterwards, we could trigger a call of the function via some VPI function call. An idea would be to simply do a vpi_put_value(...) on the function handle itself. This would be consistent with how VPI code can trigger named events. After the call, we could get the returned value using vpi_get_value(...).

Tasks are more complicated, though, because they can consume simulation time. We would be able to start a task from within an invoke(...) function and have it run in the background. Parallel behavior is modeled by threads and when starting a task, we'd need to specify where it gets started. Do we start a new thread, totally independent of all others? Do we start the task as a child process of the current thread? Regardless of where we would start the task, this could also be done by calling vpi_put_value(...) on the task handle. To be able to wait for a task to finish, we'd need to be able to set a callback for when its execution is completed. This callback could trigger an event which we would use for synchronization.

Implementing method calls via the VPI sounds like a lot of work, especially when handling tasks. It's a shame that the SystemVerilog committee decided to skip it entirely. Maybe we'll be lucky and it will make its way into the next IEEE 1800 release.

With this post I'm going to conclude our reflection series, but not before talking about some future steps. The first and most obvious is to test the library with a wider variety of simulators. I'd appreciate any help from enthusiastic users that have access to tools from other vendors. Another thing I'd like to implement is a more generic way of handling data types (i.e. an rf_type class), to be able to deal with both primitive and user defined types. This should make it easier to implement setting and getting of more than just int variables. A pretty cool thing would also be to be able to traverse the inheritance tree of a class, by getting its super-class and its sub-classes.