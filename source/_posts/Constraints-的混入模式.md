---
title: Constraints 的混入模式
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-17 16:04:27
password: 2101102
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### Constraints 的混入模式

The goal of modern verification techniques is to do as much as possible with as little code as possible. This is best done with a "write once, tweak everywhere" approach to test development. This type of flexibility comes for free in AOP; that's why it's built into *e*'s DNA. For OOP, however, it requires thought and planning, and is achieved by using design patterns. One reason why the UVM exists is to encapsulate some of these patterns for us (especially the factory). Even so, this doesn't mean that some design pattern knowledge won't help us do fancy stuff in our code.

In this post I want to talk about how to layer constraints across the sequence item class hierarchy. My points would be best understood by looking at a concrete example. Let's say that our DUT has an AHB bus. I've chosen AHB because it's very widespread and most of you will have already worked with it. We'll keep things simple and only consider a reduced sequence item:

```verilog
class ahb_item extends uvm_sequence_item;
  rand bit[31:0] addr;
  rand direction_e direction;
  rand burst_e burst;
  rand size_e size;
  rand mode_e mode;
  rand privilege_e privilege;

  rand int unsigned delay;


  constraint delay_init_val {
    delay inside { [0 : 10] };
  }

  constraint no_instr_write {
    mode == INSTR -> direction == READ;
  }

  constraint aligned_address {
    size == HALFWORD -> addr[0:0] == 0;
    size == WORD -> addr[1:0] == 0;
  }

  // ...
endclass
```

*Address* and *direction* are pretty self explanatory. *Burst* tells us how many bus cycles will be performed. *Size* represents the number of bytes transferred in each bus cycle. *Mode* tells us whether we are moving data or instructions. Finally, there is also *privilege* that shows us from what part of the code the access originated. The item already contains some structural constrains given by the protocol.

Let's say we've written two tests for our DUT. The first test does write/read-back pairs at random locations to make sure that the entire address space is accessible. It does this by starting the following sequence:

```verilog
class write_read_sequence extends uvm_sequence #(ahb_item);
  virtual task body();
    req = ahb_item::type_id::create("req");

    for (int i = 0; i < 20; i++) begin
      start_item(req);
      if (!req.randomize() with { direction == WRITE; })
        `uvm_error("RANDERR", "Randomization error")
      finish_item(req);

      start_item(req);
      req.direction = READ;
      if (!req.randomize(delay))
        `uvm_error("RANDERR", "Randomization error")
      finish_item(req);
    end
  endtask
endclass
```

The second test does purely random accesses inside the address space by starting another sequence:

```verilog
class random_access_sequence extends uvm_sequence #(ahb_item);
  virtual task body();
    req = ahb_item::type_id::create("req");

    for (int i = 0; i < 30; i++) begin
      start_item(req);
      if (!req.randomize())
        `uvm_error("RANDERR", "Randomization error")
      finish_item(req);
    end
  endtask
endclass
```

After running these tests for a while with different seeds we stumble onto a bug. It seems our device has problems when doing privileged data accesses. Addresses within *0x0* and *0x20* cause trouble when being accessed by single word bursts. We want to put more emphasis on these transfers to make sure that we're really stressing this part of the DUTs functionality. This is where "write once, tweak everywhere" comes along. We can just run the same tests as before, but add a new constraint to make the problematic bursts more likely.

This is best done by creating a new test that starts the same sequence, but sets a type override on the sequence item. This new sequence item would be defined in the same file as the test and would contain the extra constraint:

```verilog
class write_read_corner_case_ahb_item extends ahb_item;
  constraint corner_case {
    mode dist { DATA := 3, INSTR := 1 };
    privilege dist { PRIVILEGED := 3, USER := 1 };
    (mode == DATA && privilege == PRIVILEGED) ->
      (addr inside { [32'h0:32'h20] } && size == WORD && burst == SINGLE);
  }
endclass
```

The new *write_read* test would just extend the previous one that already starts the sequence and just set a type override:

```verilog
class test_write_read_corner_case extends test_write_read;
  function void end_of_elaboration_phase(uvm_phase phase);
    uvm_factory factory = uvm_factory::get();
    factory.set_type_override_by_type(ahb_item::get_type(),
      write_read_corner_case_ahb_item::get_type());
  endfunction
endclass
```

We'd want to do the same thing for the *random_access* test. If we define a similar sequence item in another test file it immediately becomes clear that we've doubled up information. The same constraint would exist in two files. At this point we could do a tradeoff between encapsulation and maintainability. We can declare the *corner_case* item outside of the tests, in some common location. This will make it fall under shared ownership (as all test writers would see it), with all the challenges that brings. At least we wouldn't need to maintain the same constraint in two (or potentially more) files.

With that settled, we run our regression longer, but we find another bug. This one has to do with reading words with 0 delay. As before, we want to guide our randomization efforts more on this one too. Adding a constraint to both of the tests is the same case that we looked at above. We can handle it in the same way. What we do notice, however, is that this bug, like the previous one, affects *WORD* transfers. It makes sense to try and combine this constraint with the one from above and make sure that we don't have any other bugs at the intersection of these two cases.

Before we proceed, let's summarize. We've currently defined a *corner_case* item and a *fast_reads* item that we can use to tweak the initial tests with:

```verilog
class corner_case_ahb_item extends ahb_item;
  constraint corner_case {
    mode dist { DATA := 3, INSTR := 1 };
    privilege dist { PRIVILEGED := 3, USER := 1 };
    (mode == DATA && privilege == PRIVILEGED) ->
      (addr inside { [32'h0:32'h20] } && size == WORD && burst == SINGLE);
  }
endclass

class fast_reads_ahb_item extends ahb_item;
  constraint fast_reads {
    size dist { WORD := 3, BYTE := 1, HALFWORD := 1 };
    (direction == READ && size == WORD) -> delay == 0;
  }
endclass
```

Now we need an item that contains both constraints. This kind of gets us stumped. Which of these items should we extend from? Is our new item a *corner_case* item with an extra constraint? If so, then we should extend from *corner_case_ahb_item*:

```verilog
class corner_case_fast_reads_ahb_item extends corner_case_ahb_item;
  constraint fast_reads {
    size dist { WORD := 3, BYTE := 1, HALFWORD := 1 };
    (direction == READ && size == WORD) -> delay == 0;
  }
endclass
```

Or is it a *fast_reads* item with an extra constraint? In that case we should extend from *fast_reads_ahb_item*:

```verilog
class corner_case_fast_reads_ahb_item extends fast_reads_ahb_item;
  constraint corner_case {
    mode dist { DATA := 3, INSTR := 1 };
    privilege dist { PRIVILEGED := 3, USER := 1 };
    (mode == DATA && privilege == PRIVILEGED) ->
      (addr inside { [32'h0:32'h20] } && size == WORD && burst == SINGLE);
  }
endclass
```

No matter what we do, however, we're doubling up some code. The problem only gets worse if we want to add a third constraint and so on.

Our conceptual failure was that this new item is neither a *corner_case_ahb_item* nor a *fast_reads_ahb_item* with a little bit on top. It's actually both. We need to do multiple inheritance, but *SystemVerilog* only supports single inheritance. Bummer, huh?

Actually, no. We already talked about how to fake multiple inheritance using the mixin pattern. Let's apply it here. Instead of having a *corner_case* item or a *fast_reads* item, let's have a mixin for each constraint:

```verilog
class corner_case_mixin #(type T) extends T;
  constraint corner_case {
    mode dist { DATA := 3, INSTR := 1 };
    privilege dist { PRIVILEGED := 3, USER := 1 };
    (mode == DATA && privilege == PRIVILEGED) ->
      (addr inside { [32'h0:32'h20] } && size == WORD && burst == SINGLE);
  }
endclass

class fast_reads_mixin #(type T) extends T;
  constraint fast_reads {
    size dist { WORD := 3, BYTE := 1, HALFWORD := 1 };
    (direction == READ && size == WORD) -> delay == 0;
  }
endclass
```

Actually, we can still have those old items, but we should implement them using the mixins:

```verilog
class corner_case_ahb_item extends corner_case_mixin #(ahb_item);
endclass

class fast_reads_ahb_item extends fast_reads_mixin #(ahb_item);
endclass
```

We can implement the new item with both constraints by applying the other mixin on top of a previously mixed in item:

```verilog
class corner_case_fast_reads_ahb_item extends
  fast_reads_mixin #(corner_case_ahb_item);
endclass
```

It doesn't really matter what order we do it in. We'll get the same great flavor either way:

```verilog
class fast_reads_corner_case_ahb_item extends
  corner_case_ahb_mixin #(fast_reads_ahb_item);
endclass
```

We can even apply the mixins successively starting from the base *ahb_item*:

```verilog
class corner_case_fast_reads_ahb_item extends
  fast_reads_mixin #(corner_case_mixin #(ahb_item));
endclass
```

You get the idea. We can add as many as we want in whatever order we want.

As a bonus, we don't even need to have shared items anymore. We can only share mixins inside some central location in our package. We can shift the responsibility of defining items for the overrides back to the tests:

```verilog
class test_write_read_corner_case_fast_reads extends test_write_read;

  // nested class
  class ovr_seq_item extends fast_reads_mixin #(corner_case_mixin #(
    ahb_item));
  endclass


  function void end_of_elaboration_phase(uvm_phase phase);
    uvm_factory factory = uvm_factory::get();
    factory.set_type_override_by_type(ahb_item::get_type(),
      ovr_seq_item::get_type());
  endfunction
endclass
```

By defining the override item inside the test as a nested class we make it clear that it's not supposed to be used anywhere else. We also make it impossible to accidentally reference items defined in other test files, because these items aren't declared in the package scope anymore. We just have to be careful not to use "by name" overrides, since that might get us into trouble (as items might share the same name).

What we've done here is traded up the value chain. We gained maintainability by doing away with doubled up constraints. Our approach also allows us to shift on the encapsulation scale (global override items vs. test encapsulated override items). We didn't create this from nothing, though. We added intelligence into our code by using the mixin pattern.