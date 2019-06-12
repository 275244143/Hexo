---
title: SystemVerilog多重继承实现
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-12 14:11:46
password: 2101114
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### SystemVerilog多重继承实现？

I talked about interface classes and how they can be used to separate what an object "can" do from "how" it does it. While using interface classes helps a lot in developing code that is modular and reusable, there are still things that are missing. If we extend a base class (in our case, *uvm_component*), how can we propagate all of these changes to its subclasses (namely *uvm_monitor*, *uvm_driver*, etc.)? This is exactly the kind of problem which could be solved with multiple inheritance. Unfortunately, *SystemVerilog* doesn't support multiple inheritance, so I guess we're out of luck...

Just kidding, as you could probably tell from the title. We can use the tools at our disposal (i.e. single inheritance) to emulate multiple inheritance. The pattern we're going to look at is called a '*mixin*'. What better way to illustrate what a mixin is than by looking at an example.

Let's say we want to enforce a rule that all ports of our UVM components are connected before the *run* phase starts. We create our own super-library based on UVM that contains this addition (and potentially more). We can add such a check to *uvm_component* by creating a subclass:

```verilog
class vgm_uvm_component extends uvm_component;
  
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
  
  function void start_of_simulation_phase(uvm_phase phase);
    check_ports();
  endfunction
  
  function void check_ports();
    `uvm_info("VGM", "I'm checking if all of my ports are connected", UVM_LOW);
  endfunction

endclass
```

We added the *check_ports()* function that makes sure that all ports are connected and we called it during the *start_of_simulation*phase. This will work fine for any class that extends directly from *vgm_uvm_component*. However, we also want to be able to extend from *uvm_driver*, *uvm_monitor*, *uvm_agent*, etc. These are subclasses of *uvm_component*, which may not provide too much now, but could potentially do more in future versions of UVM. It also makes our code's intent much clearer. What we need are *vgm*versions of these classes as well. The simplest way we could do this is by creating one subclass for each, where we copy the additions we made to *uvm_component*:

```verilog
class vgm_uvm_monitor extends uvm_monitor;
  
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
  
  function void start_of_simulation_phase(uvm_phase phase);
    check_ports();
  endfunction
  
  function void check_ports();
    `uvm_info("VGM", "I'm checking if all of my ports are connected", UVM_LOW);
  endfunction
  
endclass
```

We'd have to do something similar for each *uvm_** class, which you'll probably agree is a lot of work. Not only that, but should we find a bug in our code (maybe the *check_ports()* function isn't working properly), we'd have a lot of places to patch to fix it. This is basically why copy-pasting code is a cardinal sin in the software development world. Sure, we could define the added code as a macro and just include it in every class, but excessive preprocessor use is also something to be avoided.

It sure would be nice if we could make *uvm_monitor* inherit the changes as well, wouldn't it? It turns out that this is possible. As mentioned above, what we have to do is use a 'mixin'. What we were basically doing above was inheriting from each member of the UVM component class family. Well, why not just make the base class a parameter? Something like:

```verilog
class vgm_check_ports_mixin #(type T = uvm_component) extends T;
  
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
  
  function void start_of_simulation_phase(uvm_phase phase);
    check_ports();
  endfunction
  
  function void check_ports();
    `uvm_info("VGM", "I'm checking if all of my ports are connected", UVM_LOW);
  endfunction
  
endclass
```

We can then create our *vgm_** class family by just parameterizing this mixin with the appropriate base class:

```verilog
typedef vgm_check_ports_mixin #(uvm_component) vgm_uvm_component;
typedef vgm_check_ports_mixin #(uvm_monitor) vgm_uvm_monitor;
```

We can do this for any UVM component subclass. In our business code, instead of inheriting from *uvm_monitor* we'll inherit from *vgm_uvm_monitor* and so on.

I want to take a short break here and give credit where credit is due. The idea isn't mine, as mixins are already used in the software development world.

We've seen how we can use mixins to propagate additions to a base class down along its inheritance hierarchy. Let's now have a look at a slightly different example. In the last post I mentioned how interface classes can be used to write a much cleaner implementation of TLM. The code I showed was:

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

This snippet describes "what" each port can do (by enumerating the methods it has), but side-steps "how" it does it. Some of you may have probably been asking yourselves the following question: "Won't we have to repeat the same implementation of *get(...)*(for example) in both *uvm_blocking_get_port* and in *uvm_get_port*?". The answer is "Yes, we could, but as before, there's a better way". Let's do like in the previous case and start with the "bad" solution and refine it as we go.

A TLM port per definition forwards a method call on it to its connected implementation. This might be another port (which in turn forwards) or an end component which provides the actual implementation. What we first need is some solid ground to stand on. Let's define a base class that handles connecting and holding the implementation:

```verilog
virtual class tlm_get_port_base #(type IF);
  protected IF m_imp;
  
  function void connect(IF imp);
    m_imp = imp;
  endfunction
endclass
```

The implementation can be either blocking, non-blocking or both, so we'll leave it as a parameter. Based on this, here's how the blocking get port would look like:

```verilog
class tlm_blocking_get_port #(type T = int)
  extends tlm_get_port_base #(tlm_blocking_get_if #(T))
  implements tlm_blocking_get_if #(T);
  
  virtual task get(output T t);
    m_imp.get(t);
  endtask
  
  virtual task peek(output T t);
    m_imp.peek(t);
  endtask
  
endclass
```

It's nothing special, we're just extending the base (parameterized to accept a blocking interface) and defining the implementations of the interface methods. The non-blocking port will look similar:

```verilog
class tlm_nonblocking_get_port #(type T = int)
  extends tlm_get_port_base #(tlm_nonblocking_get_if #(T))
  implements tlm_nonblocking_get_if #(T);
  
  virtual function bit can_get();
    return m_imp.can_get();
  endfunction
  
  virtual function bit can_peek();
    return m_imp.can_peek();
  endfunction
  
  virtual function bit try_get(output T t);
    if (m_imp.try_get(t))
      return 1;
    return 0;
  endfunction
  
  virtual function bit try_peek(output T t);
    if (m_imp.try_peek(t))
      return 1;
    return 0;
  endfunction
  
endclass
```

For the "full" get port we have to implement all of these methods. This means copy-pasting the code from both of these classes:

```verilog
class tlm_get_port #(type T = int)
  extends tlm_get_port_base #(tlm_get_if #(T))
  implements tlm_get_if #(T);
    
  //--------------------------------------------------
  // methods copied from 'tlm_blocking_get_port'
  //--------------------------------------------------
  
  virtual task get(output T t);
    m_imp.get(t);
  endtask
  
  virtual task peek(output T t);
    m_imp.peek(t);
  endtask
  
  
  //--------------------------------------------------
  // methods copied from 'tlm_blocking_get_port'
  //--------------------------------------------------
  
  virtual function bit can_get();
    return m_imp.can_get();
  endfunction
  
  virtual function bit can_peek();
    return m_imp.can_peek();
  endfunction
  
  virtual function bit try_get(output T t);
    if (m_imp.try_peek(t))
      return 1;
    return 0;
  endfunction
  
  virtual function bit try_peek(output T t);
    if (m_imp.can_peek())
      return 1;
    return 0;
  endfunction
  
endclass
```

This code may not be much (and it will also most likely not change over time), so it might seem harmless. I might even tend to agree in this case, but just think what it would mean if the method definitions were more complicated...

This is another typical case where multiple inheritance would be extremely useful. If we could inherit from both the blocking and the non-blocking ports, we could have our "full" get port without any code duplication. Mixins helped us last time, so let's use them here as well.

Similarly to what we did for the UVM components, we'll implement the additions we make to the *tlm_get_port_base* class as mixins. First, let's implement the blocking get mixin:

```verilog
class tlm_blocking_get_mixin #(type T = int, type BASE = tlm_get_port_base #(tlm_blocking_get_if #(T)))
  extends BASE
  implements tlm_blocking_get_if #(T);
  
  virtual task get(output T t);
    m_imp.get(t);
  endtask
  
  virtual task peek(output T t);
    m_imp.peek(t);
  endtask
  
endclass
```

This is pretty much the blocking get port class, where we've made the base class a parameter. We do the same for the non-blocking port:

```verilog
class tlm_nonblocking_get_mixin #(type T = int, type BASE = tlm_get_port_base #(tlm_nonblocking_get_if #(T)))
  extends BASE
  implements tlm_nonblocking_get_if #(T);
  
  virtual function bit can_get();
    return m_imp.can_get();
  endfunction
  
  virtual function bit can_peek();
    return m_imp.can_peek();
  endfunction
  
  virtual function bit try_get(output T t);
    if (m_imp.try_get(t))
      return 1;
    return 0;
  endfunction
  
  virtual function bit try_peek(output T t);
    if (m_imp.try_peek(t))
      return 1;
    return 0;
  endfunction
  
endclass
```

Again, this is pretty much the non-blocking get port class, but with a parameterized base class. Implementing the get ports becomes pretty trivial; we just need to add our mixins to the appropriate base classes:

```verilog
class tlm_blocking_get_port #(type T=int)
  extends tlm_blocking_get_mixin #(T);
endclass

class tlm_nonblocking_get_port #(type T=int)
  extends tlm_nonblocking_get_mixin #(T);
endclass

class tlm_get_port #(type T=int)
  extends tlm_nonblocking_get_mixin #(T, tlm_blocking_get_mixin #(T, tlm_get_port_base #(tlm_get_if #(T))));
endclass
```

For the blocking and non-blocking ports we didn't even need to specify the base class, as we used the default values of the parameters. The "full" get port is just a blocking get port with a non-blocking mixin on top (or the other way around; either works). We just have to be careful that the class at the very base is parameterized with the proper implementation type (i.e. *tlm_get_if*). This is pretty much it. No duplication, less code to maintain and (pretty) easy to understand as well.

Let's summarize what we've learned. Even though *SystemVerilog* doesn't provide multiple inheritance, using the mixin pattern we can emulate it by using only single inheritance. Mixins can help us propagate extensions down along a class hierarchy (as we did for the UVM component class family). They can also be used to create a class that inherits from two (or even more) parallel sub-classes while avoiding the [diamond problem](http://en.wikipedia.org/wiki/Multiple_inheritance#The_diamond_problem). I for one intend to use more mixins in my code and maybe so should you.