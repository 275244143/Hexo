---
title: UVM工厂类覆盖
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-18 14:59:33
---

### UVM工厂类覆盖

When working with UVM, the phrase "you gotta use the factory!" gets drilled into our heads constantly. This is because in object oriented programming (OOP) extendability doesn't come for free. We need to plan for it by structuring our code in certain ways. Why the factory is important, though, and how it helps us achieve that goal may be kind of difficult for a beginner to understand (I know I was pretty confused back in the day). The UVM user guide doesn't explain things all that well, either. Note that I haven't cracked it open in a while, so apologies if everything I'm going to talk about in this post is already presented crystal clearly over there.

And even if it is, by all means, you should still read on. For the seasoned professionals it's going to be a walk down memory lane and maybe we'll manage to rekindle the old Specmaniac a little. For the energetic youth that's only ever worked with *SystemVerilog*, it's going to be interesting to see how the other guys do it. It might also make for a nice side by side comparison of the two languages.

A lot of of our state-of-the-art verification methodology concepts can trace their roots back to *e*. Many such ideas were pushed by Cadence to OVM and they were subsequently inherited by UVM. In *e*, a lot of neat stuff like sequences is already built into the language. Its support for aspect oriented programming (AOP) also provides a really cool way of extending the behavior of existing code without touching it. Because of this, a task where *e* really shines is in how easy it is to write tests.

Let's look at a small example. We'll assume we have an AHB slave that we want to verify. To keep things simple, we won't consider the full gamut of protocol aspects. We'll focus on an AHB item that contains fields for the transfer direction, its size and its timing:

```
<'
struct ahb_item like any_sequence_item {
  direction : [ READ, WRITE ];
  size : [ BYTE, HALFWORD, WORD ];
  delay : [ NONE, SMALL, MEDIUM, LARGE ];
};
'>
```

Declaring a sequence is done using the **sequence** keyword:

```
<'
sequence ahb_sequence using item = ahb_item;
'>
```

The **sequence** block also declares the sequence driver (aka sequencer in UVM speak). This sequencer communicates with a bus functional model (which has the same role as a UVM driver). For this example, let's just have the driver print the items it receives:

```
<'
unit ahb_bfm {
  driver : ahb_sequence_driver;

  event clock;

  on clock {
    emit driver.clock;
  };

  run() is also {
    start execute_items();
  };

  execute_items() @clock is {
    while TRUE {
      var item : ahb_item;
      item = driver.get_next_item();
      drive(item);
      emit driver.item_done;
    };
  };

  drive(item : ahb_item) @clock is {
    print item;
  };
};
'>
```

Now that we have our building blocks, we need to instantiate and connect them. This is typically done in an agent unit:

```
<'
unit ahb_agent {
  driver : ahb_sequence_driver is instance;
  bfm : ahb_bfm is instance;

  keep bfm.driver == driver;
};
'>
```

Once we instantiate the agent we're ready to go:

```
<'
import ahb;

extend sys {
  ahb : ahb_agent is instance;
};
'>
```

With the environment in place, let's write a very simple test that sends some traffic to the DUT:

```
<'
import env;

extend MAIN ahb_sequence {
  !item : ahb_item;

  keep count in [ 10..20 ];

  body() @driver.clock is only {
    for i from 1 to count {
      do item;
    };
  };
};
'>
```

The *MAIN* sequence gets started automatically on the sequencer.

From a run perspective, things work a bit differently in *e* than we're used to in *SystemVerilog*. The verification environment is typically compiled for performance. Tests are then read in on top of the compiled code by an interpreter to make additions to it. Those additions are only valid throughout the single test run. Typically, there are multiple test files, each creating a slightly different version of the verification environment.

In this very simple test we're blindly randomizing what sequence items get sent to the DUT. Eventually we'd get all combinations through, but we'd have to run this test quite a few times. Let's assume that after discussing with our designers, we find out that our device contains some special logic to treat back-to-back reads. We'd need to test it sooner rather than later. This is where the *constrained* in *constrained random* comes in.

We could add a constraint to the AHB item that makes all items reads without delays. This is done by extending our sequence item:

```
<'
import test1;

extend ahb_item {
  keep direction == READ;
  keep delay == NONE;
};
'>
```

This constraint is valid for this test. If we try to run the first test, it will still generate unconstrained items.

If we would also ascertain from our spec that doing word accesses is really important, then we could create a dedicated test for that too:

```
<'
import test1;

extend ahb_item {
  keep size == WORD;
};
'>
```

Now let's suppose we find a bug relating to byte accesses. We could create a test like we did for word accesses. At the same time, we know that back-to-back reads are special, so why not double check that they work as byte accesses? We could create a very directed test by adding another constraint on top of our read test:

```
<'
import test2;

extend ahb_item {
  keep size == BYTE;
};
'>

```

As we could see, *e* makes it very easy to write one test template and then fine tune it's parameters using constraints to home in on those pesky bugs much faster. The power of AOP enables us to write once and tweak everywhere.

*SystemVerilog* lacks AOP. Vis-à-vis the release of the 2012 LRM, Tom Fitzpatrick (a Mentor Graphics technologist) even said that his "favorite enhancement in SV-2012 is that it doesn’t have AOP". Despite that, I remember reading that one Big Three EDA vendor used to support proprietary AOP extensions. Even though some users still want the flexibility of *e*, it doesn't seem likely that anything like this will get added in the future.

This doesn't mean that we can't achieve the same effect without AOP; we're just going to have to pay an extra cost to do it. We can implement a similar scheme in OOP by using the factory pattern, It allows for the type of object that gets instantiated to be controlled at run-time. Instead of getting an object of a certain class we can get one of a subclass by configuring the factory to perform this replacement. UVM comes with an implementation of a (too) generic factory pattern.

Let's see how our verification environment would look like when implemented using UVM. First we need to define our sequence item:

```verilog
typedef enum { READ, WRITE } direction_t;
typedef enum { BYTE, HALFWORD, WORD } size_t;
typedef enum { NONE, SMALL, MEDIUM, LARGE } delay_t;


class ahb_item extends uvm_sequence_item;
  `uvm_object_utils(ahb_item)

  rand direction_t direction;
  rand size_t size;
  rand delay_t delay;

  function new(string name = "ahb_item");
    super.new(name);
  endfunction

  virtual function void do_print(uvm_printer printer);
    `uvm_print_enum(direction_t, direction, "direction", printer)
    `uvm_print_enum(size_t, size, "size", printer)
    `uvm_print_enum(delay_t, delay, "delay", printer)
  endfunction
endclass

```

We need to set up the machinery to allow objects of this class to be instantiated by the UVM factory. To do this, we register it with the factory using the *`uvm_object_utils* macro. Typical operations such as printing or packing aren't implemented for us, so we'll need to provide the compiler with our own implementations of these functions. This makes *SystemVerilog* more verbose than *e*.

Sequences aren't built into the language (at least not in the same sense as *e* sequences). *SystemVerilog* defines the **sequence**keyword, but that is an assertion construct. The sequences we're looking for are implemented as part of the UVM library. It's customary to define a base sequence that test writers would extend to implement their own scenarios:

```verilog
class ahb_sequence_base extends uvm_sequence #(ahb_item);
  `uvm_declare_p_sequencer(uvm_sequencer #(ahb_item))

  function new(string name);
    super.new(name);
  endfunction

  virtual task pre_body();
    if (starting_phase != null)
      starting_phase.raise_objection(this);
  endtask

  virtual task post_body();
    if (starting_phase != null)
      starting_phase.drop_objection(this);
  endtask
endclass

```

We'll implement the same simple driver that just prints the items it receives:

```verilog
class ahb_driver extends uvm_driver #(ahb_item);
  `uvm_component_utils(ahb_driver)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual task run_phase(uvm_phase phase);
    execute_items();
  endtask

  protected task execute_items();
    forever begin
      ahb_item item;
      seq_item_port.get_next_item(item);
      drive(item);
      seq_item_port.item_done();
    end
  endtask

  protected virtual task drive(ahb_item item);
    item.print();
  endtask
endclass

```

The agent instantiates and connects the driver and the sequencer:

```verilog
class ahb_agent extends uvm_agent;
  `uvm_component_utils(ahb_agent)

  ahb_driver driver;
  uvm_sequencer #(ahb_item) sequencer;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void build_phase(uvm_phase phase);
    driver = ahb_driver::type_id::create("driver", this);
    sequencer = uvm_sequencer #(ahb_item)::type_id::create("sequencer", this);
  endfunction

  virtual function void connect_phase(uvm_phase phase);
    driver.seq_item_port.connect(sequencer.seq_item_export);
  endfunction
endclass

```

For tests, we have a different use model as for *e*. All tests in *SystemVerilog* are compiled together into one big library and selecting which one to run is done based on the *+UVM_TESTNAME* plusarg.

We'll need a base class that sets up our environment, which tests will extend:

```verilog
virtual class test_base extends uvm_test;
  ahb_agent ahb;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void build_phase(uvm_phase phase);
    ahb = ahb_agent::type_id::create("ahb", this);
  endfunction
endclass

```

Now that we've got our infrastructure sorted out, we can start writing our tests. Let's begin with the fully random test that just sends out a stream of items. We'll need to define the sequence:

```verilog 
class main_ahb_sequence extends ahb_sequence_base;
  `uvm_object_utils(main_ahb_sequence)

  rand int unsigned count;

  constraint count_range {
    count inside { [10:20] };
  }

  function new(string name = "main_ahb_sequence");
    super.new(name);
  endfunction

  virtual task body();
    repeat (count) begin
      ahb_item item;
      `uvm_do(item)
    end
  endtask
endclass

```

The *`uvm_do* macro will request an instance of an *ahb_item* from the factory using a call to *ahb_item::type_id::create(...)*. This sequence won't get started automatically like in *e*. We'll have to start it from the test:

```verilog 
class test1 extends test_base;
  `uvm_component_utils(test1)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    uvm_config_db #(uvm_object_wrapper)::set(this, "ahb.sequencer.run_phase",
      "default_sequence", main_ahb_sequence::get_type());
  endfunction
endclass

```

Up to now, so far, so good. We've had to write similar code in both languages (albeit a little more on the *SystemVerilog* side). Now, the two paths begin to diverge. Let's try to write the test that targets back-to-back reads. We'll need to add the constraint to the AHB item, but we can't do it inside the *ahb_item* class. We can only do it in a subclass:

```verilog 
class fast_read_ahb_item extends ahb_item;
  `uvm_object_utils(fast_read_ahb_item)

  constraint fast_read {
    direction == READ;
    delay == NONE;
  }

  function new(string name = "fast_read_ahb_item");
    super.new(name);
  endfunction
endclass

```

Now, for a specific test run, we need to replace all instances of *ahb_item* with *fast_read_ahb_item*. You'll remember that this is exactly what the factory is for. We can instruct the factory that whenever an *ahb_item* is requested, it should return an instance of *fast_read_ahb_item*. Since the latter is a subclass of the former, it is assignment compatible. This replacement is done by applying a type override:

```verilog 
class test2 extends test1;
  `uvm_component_utils(test2)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    super.end_of_elaboration_phase(phase);
    ahb_item::type_id::set_type_override(fast_read_ahb_item::get_type());
  endfunction
endclass

```

When running *test2*, wherever an *ahb_item* is requested, a *fast_ahb_item* will be created in its place, thereby making sure that all AHB transfers are constrained to be back-to-back reads. We've had to write quite a bit more code, but it does the job. This is a recurring theme when comparing AOP to pure OOP.

Writing the test for word accesses is done in the same way:

```verilog 
class word_ahb_item extends ahb_item;
  `uvm_object_utils(word_ahb_item)

  constraint word {
    size == WORD;
  }

  function new(string name = "word_ahb_item");
    super.new(name);
  endfunction
endclass


class test3 extends test1;
  `uvm_component_utils(test3)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    super.end_of_elaboration_phase(phase);
    ahb_item::type_id::set_type_override(word_ahb_item::get_type());
  endfunction
endclass

```

Things get interesting when we want to stress byte back-to-back reads. We need to define the new item. It makes the most sense to extend the *fast_read_ahb_item* class to leverage its constraints. This way we just need to add a constraint for byte accesses:

```verilog 
class fast_read_byte_ahb_item extends fast_read_ahb_item;
  `uvm_object_utils(fast_read_byte_ahb_item)

  constraint byte_sized {
    size == BYTE;
  }

  function new(string name = "fast_read_byte_ahb_item");
    super.new(name);
  endfunction
endclass

```

Since *fast_read_byte_ahb_item* is a subclass of *ahb_item* we can set a type override to it:

```verilog 
class test4a extends test1;
  `uvm_component_utils(test4a)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    super.end_of_elaboration_phase(phase);
    ahb_item::type_id::set_type_override(fast_read_byte_ahb_item::get_type());
  endfunction
endclass

```

Notice that we've extended our test from *test1*. This isn't optimal, since if *test2* would have made any other modification to the initial test (like setting overrides for any other interfaces) then we won't get these. A better way is to extend *test2* and set the same override:

```verilog 
class test4b extends test2;
  `uvm_component_utils(test4b)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    super.end_of_elaboration_phase(phase);
    ahb_item::type_id::set_type_override(fast_read_byte_ahb_item::get_type());
  endfunction
endclass

```

What happens in this case is that during *super.end_of_elaboration_phase(...)* the *ahb_item* class is set to be replaced by *fast_read_ahb_item*. Setting another type override on *ahb_item* will replace the previous one, so what we will get from now are *fast_read_byte_ahb_items*.

At the same time, a very nifty feature the UVM factory supports is override chaining. We already have a test that overrides *ahb_item* with *fast_read_ahb_item*. We can also set up an override from *fast_read_ahb_item* to *fast_read_byte_ahb_item*.

```verilog 
class test4c extends test2;
  `uvm_component_utils(test4c)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void end_of_elaboration_phase(uvm_phase phase);
    super.end_of_elaboration_phase(phase);
    fast_read_ahb_item::type_id::set_type_override(
      fast_read_byte_ahb_item::get_type());
  endfunction
endclass

```

The factory will chain the overrides. Whenever an *ahb_item* is requested, the factory will want to return a *fast_read_ahb_item*. At the same time, when trying to return a *fast_read_ahb_item*, the factory will notice that that type is also overridden and it will return a *fast_read_byte_ahb_item*. This has the same effect as overriding *ahb_item* directly with *fast_read_byte_ahb_item*. Both methods can be useful so it's good to keep them in mind.

We've seen that the factory is indispensable in writing compact tests that leverage each other. Being able to direct the randomization helps find bugs earlier and close coverage faster. The type override mechanism, while powerful, is an all or nothing approach that suffers a bit in terms of flexibility. 