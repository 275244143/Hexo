---
title: 在UVM TEST中控制断言
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-14 11:26:35
password: 2101123
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### 在UVM TEST中控制断言

For verifying complex temporal behavior, SystemVerilog assertions (SVAs) are unmatched. They provide a powerful way to specify signal relationships over time and to validate that these requirements hold. One limitation of SVAs is that they can only be used in static constructs (**module**, **interface** or **checker**). Since modern verification is class based, this leads to segregation between the assertions and the testbench. There have been many papers written about how to bring these two parts of the verification environment closer together, particularly when using UVM.

Let's start our exploration of SVAs with some simple assertions for the Wishbone protocol. To keep it simple, we'll only consider a subset of signals:

```verilog
interface vgm_wb_slave_interface(input bit RST_I, input bit CLK_I);
  logic STB_I;
  logic [32:0] ADR_I;
  logic ACK_O;

  default clocking @(posedge CLK_I);
  endclocking
endinterface
```

The *STB_I* signal initiates a transfer and in classic Wishbone it's supposed to stay high until it is acknowledged by the slave:

```verilog
  stb_held_until_ack : assert property (
    $rose(STB_I) |->
      STB_I throughout ACK_O [->1]
  )
  else
    $error("STB_I must be held until ACK_O");
```

The assertion above states that once *STB_I* goes high, it's supposed to stay high until the first occurrence of *ACK_O*.

A first step to closer collaboration between the testbench and the SVAs is to integrate assertion messaging with UVM's reporting mechanism. The SVA  recommends replacing severity system tasks with calls to their corresponding *`uvm_** macros:

```verilog
  stb_held_until_ack : assert property (
    // ...
  )
  else
    `uvm_error("WBSLV", "STB_I must be held until ACK_O")
```

This is a nice idea in theory, but there are more subtle points to consider in practice. The approach works fine when there's only one instance of the interface, but not as well when we have more. For the fail messages for *$error(...)* the simulator will print the scope where the error happened. This makes it easy to trace the source of a failure. Simple calls to *`uvm_error(...)* won't do this anymore. This is because *`uvm_\*(...)* calls outside of UVM report objects get forwarded to the topmost node of the hierarchy, *uvm_root*, making it impossible to distinguish between callers.

To work around this limitation, we can add the scope to the error message ourselves:

```verilog
  stb_held_until_ack : assert property (
    // ...
  )
  else
    `uvm_error("WBSLV", $sformatf("%s\n  In scope %m",
      "STB_I must be held until ACK_O"))
```

The *%m* format specifier is a placeholder for the hierarchical path of the current scope. Let's add another assertion that checks that all address bits are at valid levels during a transfer:

```verilog
  adr_not_unknown : assert property (
    STB_I |-> !$isunknown(ADR_I)
  )
  else
    `uvm_error("WBSLV", $sformatf("%s\n  In scope %m",
      "ADR_I must be at a known level during a transfer"))
```

Passing around the scope like this in every assertion can get a bit tedious. It' also makes it difficult to change the format of our messages should we so desire (like printing the scope before the error message). To compact things a bit more, we can wrap the *`uvm_error(...)* macro with an own macro that handles printing the scope:

```verilog
  `define error(MSG) \
    `uvm_error("WBSLV", $sformatf("%s\n  In scope %m", MSG))
```

We've integrated assertion reporting with UVM, so now we'll see assertion fails contribute to the report at the end of the simulation. In addition to this, it should also open up new possibilities.

Sometimes we want to disable select assertions in certain tests where we are intentionally causing a fail scenario. Such situations could be when we are doing error testing or fault injection (for example for ISO 26262 certification). *SystemVerilog* provides the *$assertoff(...)* system task for this.

Ideally, we want to do any kind of disabling from inside our UVM environment, i.e. from our UVM test. Normally we have a reference to the interface supplied to us as a **virtual interface**:

```verilog
class test_vif extends test_base;
  virtual vgm_wb_slave_interface vif;

  virtual function void start_of_simulation_phase(uvm_phase phase);
    $assertoff(0, vif.stb_held_until_ack);
  endfunction

  // ...
endclass
```

Trying to call *$assertoff(0, vif.stb_held_until_ack)* gives different results depending on the simulator, but all of them are disappointing. One one simulator I've seen it throw a fatal run time error, while on another it just silently refused to work.

UVM provides a way of fiddling with report messages. Among others, one thing it allows us to do is to change the severity of certain messages we choose. This is done through a report catcher. We can define our own report catcher that intercepts the error message from the *stb_held_untils_ack* assertions and demotes them to warnings:

```verilog
class no_stb_until_ack_error_catcher extends uvm_report_catcher;
  function action_e catch();
    if (get_severity() == UVM_ERROR && uvm_is_match("*STB_I*", get_message()))
      set_severity(UVM_WARNING);
    return THROW;
  endfunction

  // ...
endclass
```

We then attach it to the root of the hierarchy, where we said the messages get routed:

```verilog
class test_report_catcher extends test_base;
  virtual function void end_of_elaboration_phase(uvm_phase phase);
    no_stb_until_ack_error_catcher catcher = new("catcher");
    uvm_report_cb::add(uvm_root::get(), catcher);
  endfunction

  // ...
endclass
```

This will mean that all errors for this assertion will get demoted, regardless of where they come from. If we had two instances of the interface and we'd only want to relax one of them, this wouldn't do. We could change the catcher to also match against the message content against the desired scope, but this is too flaky and it's also not tractable (e.g. what if we have 20 instances and we want to ignore the assertion in 10 of them).
how to embed a UVM component inside the interface so that it can participate in the UVM phasing and configuration mechanisms. There's no reason why such a component couldn't also participate in reporting. We can declare a light class that inherits from *uvm_component* and instantiate it:

```verilog
interface vgm_wb_slave_interface(input bit RST_I, input bit CLK_I);
  class message_reporter extends uvm_component;
    function new(string name, uvm_component parent);
      super.new(name, parent);
    endfunction
  endclass

  message_reporter reporter = new($sformatf("%m.reporter"), null);

  // ...
endinterface
```

This creates a component parallel to the testbench whose name contains the hierarchical path of it's parent interface's instance. Instead of dispatching messages to *uvm_root*, we could send them through this component. This also has the added benefit that we don't need to specify the scope anymore:

```verilog
  `define error(MSG) \
    begin \
      if (uvm_report_enabled(UVM_NONE, UVM_ERROR, "WBSLV")) \
        reporter.uvm_report_error("WBSLV", MSG, UVM_NONE, \
          `uvm_file, `uvm_line); \
    end
```

We can now attach the report catcher to the interface of interest, while leaving the other one untouched:

```verilog
class test_report_catcher extends test_base;
  virtual function void end_of_elaboration_phase(uvm_phase phase);
    no_stb_until_ack_error_catcher catcher = new("catcher");
    uvm_root top = uvm_root::get();
    uvm_component slave_if0_reporter = top.find("*slave_if0.reporter");
    uvm_report_cb::add(slave_if0_reporter, catcher);
  endfunction

  // ...
endclass
```

What I don't like about this approach is that it creates multiple tops under *uvm_root*. Normally we have a UVC for a certain protocol (in our case Wishbone) and the assertions are conceptually part of that UVC, even though they live in the static world. Our goal should be to somehow bring these assertions into the UVC agent. Instead of having the interface's reporter be instantiated under *uvm_root*, it would be really neat if we could make it a child of the agent. To do this, it has to be created inside the agent instead of getting *new*-ed in the interface. This is going to be problematic since the reporter class is defined in the interface.

This idea of instantiating classes inside interfaces and referencing them in the UVM hierarchy is suspiciously similar to  on how to achieve interface polymorphism. There I mentioned that the idea came from older papers that favored the idea of abstract BFMs.

The first step is to define an abstract class that replaces the interface, a so called proxy:

```verilog
virtual class checker_proxy extends uvm_component;
  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
endclass

virtual class sva_checker_wrapper;
  pure virtual function checker_proxy get_proxy(string name,
    uvm_component parent);
endclass
```

We also need another helper class whose only task is to instantiate the proxy. Inside the interface we define the concrete implementations of these classes:

```verilog
interface vgm_wb_slave_interface(input bit RST_I, input bit CLK_I);
  typedef class checker_proxy;
  checker_proxy proxy;

  class checker_proxy extends vgm_wb::checker_proxy;
    function new(string name, uvm_component parent);
      super.new(name, parent);
    endfunction
  endclass

  class sva_checker_wrapper extends vgm_wb::sva_checker_wrapper;
    virtual function checker_proxy get_proxy(string name, uvm_component parent);
      if (proxy == null)
        proxy = new(name, parent);
      return proxy;
    endfunction
  endclass

  sva_checker_wrapper checker_wrapper = new();

  // ...
endinterface
```

Notice that we defined a field for the proxy object, but we didn't instantiate it yet. This is will be done in the *get_proxy(...)*function, where it gets passed the name and the parent. We want to pass this wrapper class to the agent so that it can call this function, effectively passing itself back to the interface and becoming the proxy's parent. We  can do this via the config DB:

```verilog
module top;
  vgm_wb_slave_interface slave_if0(rst, clk);

  initial
    uvm_config_db #(vgm_wb::sva_checker_wrapper)::set(null, "*.slave_if0_agent",
      "checker_wrapper", slave_if0.checker_wrapper);

  // ...
endmodule
```

In the agent we call *get_proxy(...)*, passing it a name and itself as a parent:

```verilog
class agent extends uvm_agent;
  checker_proxy sva_checker;

  virtual function void build_phase(uvm_phase phase);
    sva_checker_wrapper checker_wrapper;
    if (!uvm_config_db #(sva_checker_wrapper)::get(this, "",
      "checker_wrapper", checker_wrapper)
    )
      `uvm_fatal("CFGERR", "No checker wrapper received")

    sva_checker = checker_wrapper.get_proxy("sva_checker", this);
  endfunction

  // ...
endclass
```

This way we've separated the act of declaring the proxy from instantiating it. We've let the agent know that the interface exists and asked it to create the proxy as a child component. Now, if we change the *`error(...)* macro to use the proxy, messages reported from the interface will seem like they originated from inside the agent:

```verilog
  `define error(MSG) \
    begin \
      if (uvm_report_enabled(UVM_NONE, UVM_ERROR, "WBSLV")) \
        proxy.uvm_report_error("WBSLV", MSG, UVM_NONE, \
          `uvm_file, `uvm_line); \
    end
```

When we want to disable assertions, we can attach the report catcher to the SVA checker proxy inside the agent:

```verilog
class test_agent_report_catcher extends test_base;
  vgm_wb::agent slave_if0_agent;
  vgm_wb::agent slave_if1_agent;

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    no_stb_until_ack_error_catcher catcher = new("catcher");
    uvm_report_cb::add(slave_if0_agent.sva_checker, catcher);
  endfunction

  // ...
endclass
```

No more parallel hierarchies and no more fiddling with children of *uvm_root*.

One of the main motivations in the Verilab paper for having an embedded UVM component inside the interface is so that we could use the configuration database to tweak various settings inside it. There's no reason why we couldn't do it now as well. We don't even need the config DB. For example, the Wishbone protocol also defines the so called pipelined mode. In this mode, the *STB*signal doesn't need to stay high until the transfer is completed. A *CYC* signal (which we've ignored until now) is supposed to stay asserted from start (*STB*) to finish (*ACK*):

```verilog
interface vgm_wb_slave_interface(input bit RST_I, input bit CLK_I);
  logic CYC_I;

  bit m_is_pipelined;

  cyc_held_until_end : assert property (
    $rose(STB_I) |-> CYC_I
      ##0 (ACK_O or ##1 CYC_I throughout
        (!m_is_pipelined && STB_I || ACK_O) [->1])
  )
  else
    `error("CYC_I must be held until transfer end");

  // ...
endinterface
```

The *m_is_pipelined* variable controls the mode we are in. We could control its value from the UVM environment via the proxy. We first need to declare a function inside the abstract proxy class to set this variable's value:

```verilog
virtual class checker_proxy extends uvm_component;
  // ...

  pure virtual function void set_pipelined(bit is_pipelined);
endclass
```

The abstract proxy class advertises to its users that it's authorized to configure the mode of its interface. Inside the interface, this function's implementation will reference the *m_is_pipelined* variable:

```verilog
interface vgm_wb_slave_interface(input bit RST_I, input bit CLK_I);
  class checker_proxy extends vgm_wb::checker_proxy;
    virtual function void set_pipelined(bit is_pipelined);
      m_is_pipelined = is_pipelined;
    endfunction
  endclass

  // ...
endinterface
```

The test can now easily configure the interface associated with a certain agent via its proxy:

```verilog
class test_agent_report_catcher extends test_base;
  virtual function void start_of_simulation_phase(uvm_phase phase);
    slave_if1_agent.sva_checker.set_pipelined(1);
  endfunction

  // ...
endclass
```

Now we've got the interface fully under our control.Let's take a quick look back and see what we've managed to do. We've achieved much tighter integration between our SVAs defined in the interface (static) and our UVC agent (dynamic). By forwarding fail messages through a child component of the agent we've made it seem like the assertions are instantiated inside the UVC. This proxy component takes the place of the static interface for tasks such as disabling individual assertions (using a report catcher) or configuring various parameters. Now we can tweak SVAs to our heart's desire directly from the UVM testbench.