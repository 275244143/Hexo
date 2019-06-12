---
title: SystemVerilog接口Class
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-12 11:25:12
---

### SystemVerilog接口Class

An **interface class** has nothing to do with the **interface** construct. It represents the same concept as an interface in *Java* (a lot of *SystemVerilog*'s object oriented programming constructs are pretty similar similar to *Java*'s). What does an interface class do? It's basically a collection of method declarations. Notice I've used the word 'declarations' and not 'definitions', as all methods of an **interface class** must be pure. Another class can implement an interface class, which requires it to implement all of the methods declared in that interface.

Why is this useful? I'll answer this question with the help of an example. Let's say I have my own library. In this library I expect to operate on a certain type of objects (by operating on objects I mean calling methods on them). Concretely, let's say I have the 'drivable' interface, which defines the capabilities of an object that can be driven (I don't want 'car' here and you'll see why in just a bit). What can a drivable object do? Well, it can accelerate, it can turn and it can brake, to name a few things. We model these as functions that a drivable object has:

```verilog
interface class drivable_if;
  pure virtual function void accelerate();
  pure virtual function void turn_left();
  pure virtual function void turn_right();
  pure virtual function void brake();
endclass
```

A driver can use these methods to drive a drivable object:

```verilog
class driver;
  protected drivable_if m_drivable;
  
  function new(drivable_if drivable);
    m_drivable = drivable;
  endfunction

  function void drive();
    m_drivable.accelerate();
    m_drivable.turn_right();
    m_drivable.accelerate();
    m_drivable.turn_left();
    m_drivable.brake();
  endfunction
endclass
```

Our **driver** class can operate on any object that provides the methods of the **drivable_if** interface, regardless of how these methods are implemented. (I'll use the term 'interface' instead of 'interface class' in this post, but just know that this is what I mean.)

In our code (outside of the library), we define the **car** class, that implements the **drivable_if** interface:

```verilog
class car implements drivable_if;
  
  //----------------------------------------
  // methods of drivable_if  
  //----------------------------------------
  
  virtual function void accelerate();
    $display("I'm accelerating");
  endfunction

  virtual function void turn_left();
    $display("I'm turning left");
  endfunction

  virtual function void turn_right();
    $display("I'm turning right");
  endfunction

  virtual function void brake();
    $display("I'm braking");
  endfunction
endclass
```

We can now use an instance of this class, together with an instance of the driver class:

```verilog
module top;
  initial begin
    static car the_car = new();
    static driver the_driver = new(the_car);
    the_driver.drive();
  end
endmodule
```

Remember, the **driver** class and the **drivable_if** interface are defined in an own package (that we downloaded, bought, etc.), which we'll assume we can't change. We could, however, let our own **car** object be driven by the **driver** object, even though the **driver** class did not know anything about the **car** class. This is because the **car** class provides the methods that the driver expects to be able to drive it. It doesn't matter how those methods were implemented, just that they were implemented.

What you're now probably going to ask is: "But Tudor, why didn't you just implement a virtual class? You can essentially get the same thing: you define the methods and you can't create any instances of that class.". And you would be right, but what if we want our **car** class to implement another interface at the same time? If I use a virtual class, I'm in trouble, because you can only extend one base class. You can, however, implement as many interfaces as you want.

What else do you want to do with a car besides drive it? You want to insure it. I don't know how it is in other places, but in most (if not all) European countries, the insurance premium depends on the size of the car's engine. What it may also depend on is the accident history of the car (not technically true in the real world, but please bear with me on this one). Insuring a car is a different aspect than driving it, so it makes sense to have a separate library the handles this topic. Following the example from above, this is how the interface for an insurable object (notice I didn't say car) might look like:

```verilog
interface class insurable_if;
  pure virtual function int unsigned get_engine_size();
  pure virtual function int unsigned get_num_accidents();
  pure virtual function int unsigned get_damages(int unsigned accident_index);
endclass
```

Using these methods to query an object, an insurer could compute the premium for that object:

```verilog
class insurer;
  virtual function int unsigned insure(insurable_if insurable);
    int engine_size = insurable.get_engine_size();
    int num_accidents = insurable.get_num_accidents();
    int damages;
    for (int i = 0; i < num_accidents; i++)
      damages += insurable.get_damages(i);

    // do some bogus calculation
    return engine_size * 10 + damages * 100;
  endfunction
endclass
```

Let's take our previous **car** class and expand it to be insurable. What we need to do is implement the **insurable_if** interface and define its methods:

```verilog
class car implements drivable_if, insurable_if;
  protected int unsigned m_engine_size;
  protected int m_damages[];
  
  function new(int unsigned engine_size);
    m_engine_size = engine_size;
  endfunction

  function void crash(int damages);
    m_damages = new[m_damages.size() + 1] (m_damages);
    m_damages[m_damages.size() - 1] = damages;
  endfunction
  
  
  //----------------------------------------
  // methods of insurable_if  
  //----------------------------------------

  virtual function int unsigned get_engine_size();
    return m_engine_size;
  endfunction

  virtual function int unsigned get_num_accidents();
    return m_damages.size();
  endfunction

  virtual function int unsigned get_damages(int unsigned accident_index);
    assert (accident_index < get_num_accidents());
    return m_damages[accident_index];
  endfunction
  
  
  //----------------------------------------
  // methods of drivable_if  
  //----------------------------------------
  
  // ...
endclass
```

I've added a **crash()** method to simulate an accident. Let's insure our car:

```verilog
module top;
  initial begin
    static car the_car = new(3);
    static driver the_driver = new(the_car);
    static insurer the_insurer = new();
    
    the_driver.drive();
    the_car.crash(500);
    $display("The insurance premium is ", the_insurer.insure(the_car));
  end
endmodule
```

What we can do now is drive the car, like before, but we can also insure it. We've managed to glue together two different behaviors into one single class (**car**) and then use them in objects that are each concerned with only one of these behaviors (**driver**and **insurer**). We also didn't mix in any information about insurability in the drivability package and vice-versa  This wouldn't have been possible without interface classes.

If we were to use only inheritance, this would mean that we would need to have a base class that contained both the **drivable_if**and the **insurable_if** methods. Then, both of these libraries could operate on subclasses of this class. The biggest (and I really mean big) problem with this is that this creates tight coupling between the two libraries. What if we want to use a third library? Our base class would need to contain the methods this library uses to operate on objects as well. Throw a forth library in the mix and it already becomes unmanageable. If we would want to implement just one of these behaviors in a subclass, we would still be cluttered with methods from the others. Using only inheritance results in big class hierarchies, with a lot of duplication and parallel branches.

Look at the UVM for example. It tries to do everything, simply because it has to do as much as possible. The reason is that once you're inheriting from a UVM class, you're kind of stuck in that class hierarchy. You have to use libraries that can operate with UVM classes. By using interface classes, you can happily extend from any UVM class, but at the same class implement any number of interfaces you want. This means you can now work with libraries that are completely agnostic of UVM. With interface classes using UVM stops being an "either/or" proposition.

The UVM BCL could also use a makeover. The current implementation of TLM is a mess in my opinion. It relies heavily on macros, with all TLM methods declared in all port types. The ones that are not supposed to be used in a certain port are blocked at run time by issuing an error. Ideally, calling a method not intended for a specific port should not make it past compile. Have a look at the implementation and tell me if that code is clear and maintainable to you (the files are uvm_tlm_ifs.svh, uvm_ports.svh and uvm_tlm_imps.svh).

TLM is implemented very cleanly in SystemC, using the interface concept. Dave Rich already touched on this subject in his DVCon Paper, "The Problems with Lack of Multiple Inheritance in SystemVerilog and a Solution". He already stated that interfaces would solve the problem of having to copy-paste a lot of code between classes. The paper was written in 2010, so there wasn't any **interface class** yet (though I suspect it was in the works). Here's a short example of how the TLM get interfaces could be implemented:

```verilog
interface class uvm_blocking_get_if #(type T=int);
  pure virtual task get(output T t);
  pure virtual task peek(output T t);
endclass


interface class uvm_nonblocking_get_if #(type T=int);
  pure virtual function bit try_get(output T t);
  pure virtual function bit can_get();
  pure virtual function bit try_peek(output T t);
  pure virtual function bit can_peek();
endclass


interface class uvm_get_if #(type T) extends
  blocking_get_if #(T),
  nonblocking_get_if #(T);
```

Here we also see another cool fact: an interface class can extend as many interface classes as it wants. This means that the **uvm_get_if** will declare all of the methods of both the **uvm_blocking_get_if** and of the **uvm_nonblocking_get_if**. The family of *get* ports will implement these interfaces:

```verilog
class uvm_blocking_get_port #(type T=int) implements
  uvm_blocking_get_if #(T);
  // ...
  
  virtual task get(output T t);
    // ...
  endtask
  
  // other uvm_blocking_get_if interface methods ...
endclass


class uvm_nonblocking_get_port #(type T=int) implements
  uvm_nonblocking_get_if #(T);
  // ...
  
  virtual function bit try_get(output T t);
    // ...
  endfunction
  
  // other uvm_nonblocking_get_if interface methods ...
endclass


class uvm_get_port #(type T=int) implements
  uvm_get_if #(T);
  // ...
  
  // uvm_blocking_get_if interface methods ...
  
  // uvm_nonblocking_get_if interface methods ...
endclass
```

Doing the following will now result in a compile error:

```verilog
uvm_nonblocking_get_port some_port = new();
some_item item;

some_port.get(item);
```

The **get(...)** method is not defined in the **uvm_nonblocking_get_port_if** interface, so the compiler can immediately flag an error, something that isn't possible in the current release of the UVM library.

Now, dare I say that the whole TLM aspect could be spun out into a standalone library that could be used by others that want to use TLM, but not the whole UVM? Yes I do dare, but whether this will happen is doubtful. Many more such examples could be found in the UVM BCL; to name one, the whole sequence mechanism is also a pretty unwieldy beast.

I hope this post inspires you to incorporate interface classes into your coding to enable the creation of reusable libraries that are orthogonal to each other, but can be used together. A great example of this is the *Java* standard library. I also hope that this new feature will lead to the creation of more open source packages that can accomplish various tasks. 