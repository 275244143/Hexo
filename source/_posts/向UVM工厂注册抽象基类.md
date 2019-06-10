---
title: 向UVM工厂注册抽象基类
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-10 16:02:05
---

Every now and again I stumble upon a situation where it's natural to use an abstract class. A typical example is when working with parameterized classes and wanting to swap parameterizations:

```verilog
virtual class some_abstract_component extends uvm_component;
  pure virtual function void do_stuff();

  virtual task run_phase(uvm_phase phase);
    do_stuff();
  endtask
endclass


class some_concrete_param_component #(type T = int) extends
  some_abstract_component;

  virtual function void do_stuff();
    $display("I'm doing %s stuff", $typename(T));
  endfunction
endclass
```

This is something we used on coverage extendability, when we talked about having policy classes as parameters to coverage collector components.

Each parameterization of a class creates an own inheritance tree independent of the others. If we want to be able to store any parameterization in a variable, we need a common base class:

```verilog
some_abstract_component comp;
some_concrete_param_component #(bit) bit_comp = new();
some_concrete_param_component #(real) real_comp = new();

// allowed
comp = bit_comp;

// also allowed
comp = real_comp;
```

By tagging the base class as **virtual** we've marked it as incomplete. We've declared that it can do something (via the *do_stuff()*function), but we haven't yet told the compiler how it can do it. This is left to sub-classes. We want to be able to easily swap parameterizations, without resorting to a big **if/else** cascade or a long **case** statement. This is what the UVM factory is for. Assuming that both types are registered with the factory we could do the following:

```verilog
some_abstract_component comp = some_abstract_component::type_id::create(...);

// In a test, before creating 'comp'
some_abstract_component::type_id::set_type_override(
  some_concrete_param_component #(bit)::get_type());

// In a different test, also before creating 'comp'
some_abstract_component::type_id::set_type_override(
  some_concrete_param_component #(real)::get_type());
```

The type overrides let the factory know that wherever we wanted to instantiate *some_abstract_component* it should instantiate the overridden type instead. We can't (officially) do this out of the box.

Depending on your simulator you can see one of the following outcomes when using the *uvm_object_utils* macro with a virtual class:

1. the code compiles without any problems; if the virtual class constructor ends up being called (which would happen if we'd forget to set an override) a fatal error is issued
2. you get a warning that you're trying to instantiate a virtual class, but the code still compiles; as above, actually calling the constructor is not allowed
3. the compiler stops with an error saying that it's illegal to instantiate a virtual class

Out of the three above, only outcome number 3 follows the LRM strictly. In the interest of portability, we shouldn't be writing code that relies on vendor "features" to compile. This is the whole reason why we as an industry have moved to *SystemVerilog*, isn't it?

Let's look at what the uvm_component_utils macro expands to:

```verilog
virtual class some_abstract_class extends uvm_component;
  // ...

  // `uvm_component_utils(some_abstract_class)
  `m_uvm_component_registry_internal(some_abstract_class, some_abstract_class)
  `m_uvm_get_type_name_func(some_abstract_class)
endclass
```

Let's dig deeper and see how factory registration is done by also expanding the *m_uvm_component_registry_internal(...)* macro:

```verilog
virtual class some_abstract_class extends uvm_component;
  // ...

  // `m_uvm_component_registry_internal(some_abstract_class, ...)
  typedef uvm_component_registry #(some_abstract_class,
    "some_abstract_class") type_id;

  static function type_id get_type();
    return type_id::get();
  endfunction

  virtual function uvm_object_wrapper get_object_type();
    return type_id::get();
  endfunction
endclass
```

The veil of secrecy is being lifted. The ominous *type_id* that we've been using is actually a **typedef** that is shorthand for a parameterization of *uvm_component_registry*. If we open up its source code we can find the offending function:

```verilog
class uvm_component_registry #(...) extends uvm_object_wrapper;

  // After elaboration with 'some_abstract_class' as an parameter
  virtual function uvm_component create_component (string name,
                                                   uvm_component parent);
    some_abstract_class obj;
    obj = new(name, parent);  // !!!
    return obj;
  endfunction

  // ...
endclass
```

The *create_component(...)* function calls *new(...)* to get an object of the type its parameterized with, which in our case is *some_abstract_class*. Because of this, we can't parameterize *uvm_component_registry* with a virtual class. The same point also applies for classes that inherit directly from *uvm_object* and its corresponding *uvm_object_registry*.

Before we continue, it might be a good idea to take a step back and look at what exactly happens when we create an object using the factory. The first cog in the machine is the *uvm_object_wrapper* class, which contains two methods, *create_object(...)* and *create_component(...)*. The class itself is **virtual** and these methods are almost **pure virtual** (in the sense that they don't do anything)**:**

```verilog
virtual class uvm_object_wrapper;
  virtual function uvm_object create_object (string name="");
    return null;
  endfunction

  virtual function uvm_component create_component (string name,
                                                   uvm_component parent);
    return null;
  endfunction
endclass
```

A class that can be created by the factory must have a corresponding *uvm_object_wrapper* associated with it, that implements the corresponding *create_\*(...)* function to call that class's constructor, thereby returning an instance of that class:

```verilog
class some_class extends uvm_object;
  extern function new(string name);
endclass

class some_class_wrapper extends uvm_object_wrapper;
  virtual function uvm_object create_object(string name);
    some_class obj = new(name);
    return obj;
  endfunction
endclass
```

The factory can create an instance of *some_class* by using its wrapper:

```verilog
class uvm_factory;
  function uvm_object create_object_by_type(uvm_object_wrapper requested_type,
    string name = ""
  );
    // ...
    return requesed_type.create_object(name);
  endfunction

  // ...
endclass
```

It would be rather boring if this is all it would do, because what would then be the point of using the factory? We could just as easily create an object in our user code. What the factory first does is it checks if there is an override in place. If there is, instead of calling *create_object(...)* on the wrapper it got as an argument, it's going to call it on the wrapper of the overriding type:

```verilog
class uvm_factory;
  function uvm_object create_object_by_type(uvm_object_wrapper requested_type,
    string name = ""
  );
    uvm_object_wrapper returned_type;
    if (has_override(requested_type))
      returned_type = get_override(requested_type);
    else
      returned_type = requested_type;
    return returned_type.create_object(name);
  endfunction

  // ...
endclass
```

For simplicity, we can imagine that the lookup mechanism works like a look up table, which maps one wrapper to a potentially different wrapper.

Let's go back to how wrappers are defined. What we've looked at up to now are the classes behind the curtain of encapsulation, that we as users don't normally see. As the task of registering a class with the factory is something that we need to do quite often, the nice people at Accellera defined some classes that can handle this easily: *uvm_object_registry* and *uvm_component_registry*. These are sub-classes of *uvm_object_wrapper* and parameterized with the class they are supposed to create:

```verilog
class uvm_object_registry #(type T=uvm_object) extends uvm_object_wrapper;
  typedef uvm_object_registry #(T) this_type;

  // ...
endclass
```

This way, these classes can provide generic implementations of *create_object(...)* and *create_component(...)*, respectively:

```verilog
class uvm_object_registry #(type T=uvm_object) extends uvm_object_wrapper;
  // ...

  virtual function uvm_object create_object(string name);
    T obj = new(name);
    return obj;
  endfunction
endclass
```

By having the class of interest as a parameter, we avoid having to always declare a sub-class for each new class we want to use with the factory. The **_registry* classes also provide the famous *create(...)* function we've been told to always call instead of *new(...)*. This function gets an instance of the registry class its being called on and passes it to the factory to do the actual creation:

```verilog
class uvm_object_registry #(type T=uvm_object) extends uvm_object_wrapper;
  // ...

  static function T create(string name);
    uvm_object obj;
    uvm_factory f = uvm_factory::get();
    obj = f.create_object_by_type(get());
    if (!$cast(create, obj))
      uvm_report_fatal("FCTTYP", "...", UVM_NONE);
  endfunction
endclass
```

The registry classes are implemented as singletons; this means that there can only ever be a single instance of a certain registry and the *get(...)* function will return it. The object returned by the factory needs to be cast to make sure that it's compatible with the original class. This means it has to be of either the same type or a sub-class.

Now that we know a little more about how the factory mechanism is implemented, we can get back to the problem at hand: associating abstract classes with registry classes.

A cool feature that *C++* has is template specialization. This means that it's possible to modify the implementation of the code that gets generated when a template is specialized with a certain type. For our example, this would mean that we would writing something like:

```verilog
class uvm_component_registry #(some_abstract_class, ...) extends
  uvm_object_wrapper;

  // After elaboration with 'some_abstract_class' as an parameter
  virtual function uvm_component create_component (string name,
                                                   uvm_component parent);
    `uvm_fatal("NEWERR", "Trying to create a virtual class")
    return null;
  endfunction
endclass
```

This means that for all other classes except *some_abstract_class* the *create_component(...)* function does exactly what it used to do in the generic implementation (i.e. it instantiates an object). For *some_abstract_class* it issues a fatal error instead, because this means that the user forgot something (most likely a factory override). This mechanism isn't supported by *SystemVerilog*, so we'll have to find another solution.

If we go back to the macro expansion, we can see that we can replace the type of *type_id* with something other than *uvm_component_registry*. We need a different class that extends *uvm_object_wrapper*, but doesn't call the constructor of the class it's parameterized with and instead issues a fatal error:

```verilog
class vgm_abstract_component_registry #(type T=uvm_component,
  string Tname="<unknown>") extends uvm_object_wrapper;

  virtual function uvm_component create_component(string name,
    uvm_component parent
  );
    `uvm_fatal("INTERR", $sformatf("Trying to create an instance of class %s",
      Tname))
    return null;
  endfunction

  // ...
endclass
```

We also need to implement the singleton infrastructure required to get an instance of the class:

```verilog
class vgm_abstract_component_registry #(type T=uvm_component,
  string Tname="<unknown>") extends uvm_object_wrapper;

  typedef vgm_abstract_component_registry #(T, Tname) this_type;

  local static this_type me = get();

  static function this_type get();
    if (me == null) begin
      uvm_factory f = uvm_factory::get();
      me = new();
      f.register(me);
    end
    return me;
  endfunction

  // ...
endclass
```

The key part of the whole mechanism, the *create(...)* function is still missing. Notice that we've extended our class from *uvm_object_wrapper* directly. What I first tried was to extend *uvm_component_registry*, so I would only need to override the methods of interest and inherit the rest from the base class. This didn't work, because that would mean elaborating the base class with a virtual class as its parameter, which results in an instant compile error. Even if the latter doesn't happen, since the *create(...)* function of *uvm_component_registry* calls the class's *get()* function (which is **static**) it won't ever be possible to get it to call the *get()* function defined in the sub-class. This means that the factory would always receive an instance of *uvm_component_registry*.

What we need to do is (gasp!) duplicate the code that implements *create(...)* and *set_\*_override(...)*, to allow users to use the new registry class in the same way as the original one from UVM:

```verilog
class vgm_abstract_component_registry #(type T=uvm_component,
  // ...

  static function T create(string name, uvm_component parent, string contxt="");
    // ...
  endfunction


  static function void set_type_override (uvm_object_wrapper override_type,
                                          bit replace=1);
    // ...
  endfunction


  static function void set_inst_override(uvm_object_wrapper override_type,
                                         string inst_path,
                                         uvm_component parent=null);
    // ...
  endfunction
endclass
```

A lot of this clipboard based inheritance could have been avoided with some better choice of class hierarchy. Even the *uvm_object_registry* and *uvm_component_registry* classes contain a lot of duplicated code that could have been refactored. For example, a *uvm_registry* base class could have provided the required infrastructure for creation and factory overrides.

Aside from registering a class with the factory, we've seen that the *uvm_\*_utils* macros do a bit more, like implementing the *get_type_name()* function. To have a similar look and feel to the UVM macros, we could define their abstract counterparts:

```verilog
`define vgm_abstract_component_utils(T) \
   `m_vgm_abstract_component_registry_internal(T,T) \
   `m_uvm_get_type_name_func(T)

`define m_vgm_abstract_component_registry_internal(T,S) \
   typedef vgm_abstract_component_registry #(T,`"S`") type_id; \
   static function type_id get_type(); \
     return type_id::get(); \
   endfunction \
   virtual function uvm_object_wrapper get_object_type(); \
     return type_id::get(); \
   endfunction
```

I've only shown the *abstract_component_utils* macro, but we can extend the concept to the *abstract_object_utils* macro, their *begin/end* variants and the *param* versions. I know we're not supposed to be using the *m_uvm_** versions of the macros, but I like to live on the wild side. For code that is supposed to enhance the library, I guess it's not a big problem if it's tightly coupled to its implementation.

### 读到这里说明你毅力不错，最重要的是UVM-1.2已经可以直接注册了，是不是被欺骗了得感觉？！！哈哈！

