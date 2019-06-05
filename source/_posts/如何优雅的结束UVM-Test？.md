---
title: 如何优雅的结束UVM Test？
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-05 14:07:48
---

### 如何优雅的结束UVM Test？

End-of-test relies on objections. Each component can raise objections during the run phase, meaning that it’s not yet ready to let the test finishthe test finish. We typically raise an objection in the test, when starting our root sequence:

```verilog
class test extends uvm_test;
  virtual task run_phase(uvm_phase phase);
    phase.raise_objection(this);
    seq.start(sequencer);
    phase.drop_objection(this);
  endtask

  // ...
endclass
```

This means that while the sequence is running, the test will keep going. Once we’ve finished pushing all of our traffic into the DUT, it will stop. This works great for designs without any latency. If our design processes data in the clock cycle it got it, then it’s fine if we just stop the simulation at that point. The isn’t usually the case. Due to the sequential nature of today’s designs, the effect of any kind of transaction fed to the DUT can only be seen one or more clock cycles later. If we stop the simulation at the time the transaction was accepted by the design, then we won’t be able to check what happens as an effect of that transaction.

As an example, let’s take a very boring design. Our DUT will have two APB interfaces, one slave and one master. Whatever comes in on the north (master) interface is going to come out of the south (slave) interface 16 clock cycles later. 

We'll need to instantiate two agents:

```verilog
class env extends uvm_env;
  apb_master_agent master_agent;
  apb_slave_agent slave_agent;

  // ...
endclass
```

I'll spare you the code for actually instantiating and configuring the agents, since it's pretty much boilerplate.

What every testbench needs is a scoreboard to check that the DUT is doing what it's supposed to do. In this case, the scoreboard is pretty trivial. Whenever an item comes from the master agent, we should expect another item with identical characteristics to come from the slave agent.

```verilog
class scoreboard extends uvm_scoreboard;
  `uvm_analysis_imp_decl(_north)
  `uvm_analysis_imp_decl(_south)

  uvm_analysis_imp_north #(apb_mon_item, scoreboard) north_aimp;
  uvm_analysis_imp_south #(apb_mon_item, scoreboard) south_aimp;

  // ...
endclass
```

Since it can be a while until a south side item comes, in the meantime we'll need to buffer the north side items in a queue. The APB UVC sends out two items per transfer through its analysis port, one for the setup phase and another for the access phase. I don't particularly like this approach, since it forces us to implement logic to throw out the setup phase item (two analysis ports would have been better):

```verilog
class scoreboard extends uvm_scoreboard;
  protected int unsigned num_seen_north_items;

  protected apb_mon_item item_stream[$];


  virtual function void write_north(apb_mon_item item);
    num_seen_north_items++;
    if (num_seen_north_items % 2 == 1)
      return;

    `uvm_info("WRNORTH", "Got a north item", UVM_NONE)
    item_stream.push_back(item);
  endfunction

  // ...
endclass
```

When a south side item comes, we'll need to compare it with the first item in the queue:

```verilog
class scoreboard extends uvm_scoreboard;
  protected int unsigned num_seen_south_items;

  protected apb_mon_item item_stream[$];


  virtual function void write_south(apb_mon_item item);
    num_seen_south_items++;
    if (num_seen_south_items % 2 == 1)
      return;

    `uvm_info("WRSOUTH", "Got a south item", UVM_NONE)
    if (!item.compare(item_stream.pop_front()))
      `uvm_error("DUTERR", "Mismatch")
  endfunction

  // ..
endclass
```

What we absolutely need to check is that at the end of the simulation there aren't any outstanding north side items that didn't yet make it to the south side. This means our queue must be empty. A great place to put this check is the *check_phase(...)* function:

```verilog
class scoreboard extends uvm_scoreboard;
  virtual function void check_phase(uvm_phase phase);
    if (item_stream.size() != 0)
      `uvm_error("DUTERR", "There are still unchecked items")
  endfunction

  // ...
endclass
```

Here's where gracious test termination becomes important. If we just stop the simulation once the last north side item was sent, we're going have at least one item in our queue, which will cause the test to fail. This means we can't just simply start our sequence in this way:

```verilog
class test extends uvm_test;
  virtual task run_phase(uvm_phase phase);
    apb_pipeline_tb::pipeline_sequence seq =
      apb_pipeline_tb::pipeline_sequence::type_id::create("seq", this);

    phase.raise_objection(this);
    seq.start(tb_env.master_agent.sequencer);
    phase.drop_objection(this);
  endtask

  // ...
endclass
```

We need to make sure that the objection gets dropped once the last item comes out through the south side APB interface. The naive approach would be to add a delay inside the test between the sequence finishing and dropping the objection:

```verilog
class test_delay extends test;
  virtual task run_phase(uvm_phase phase);
    apb_pipeline_tb::pipeline_sequence seq =
      apb_pipeline_tb::pipeline_sequence::type_id::create("seq", this);

    phase.raise_objection(this);
    seq.start(tb_env.master_agent.sequencer);

    #(16 * 2);

    phase.drop_objection(this);
  endtask

  // ...
endclass
```

This is going to work, though it might need an extra time step to avoid any race conditions when stopping the simulation (because the south side monitor might not get a chance to publish its item). There are a few drawbacks, though:

1. We're going to have to add such a delay to each test we write. Once our designers decide that they need a 17 cycle deep pipeline, we're going to have to modify each and every one of these tests. This can, of course, be solved by writing a function that drops the objection and applies the delay beforehand.
2. We've implemented the delay in terms of simulation steps, when we're actually interested in clock cycles (hence the multiplication with 2 - a clock cycle takes two simulation time steps). The same argument applies also if we were to wait for a certain number of time units. If someone decides that we need a longer clock, we're going to have to update the delays. This can also be solved by sending the APB clock to the test and using it for the delay. This is easier said than done in *SystemVerilog*, since what this entails is defining an interface, instantiating it, putting it into the config DB and getting it in the test.
3. For complicated designs it might be difficult, if not impossible, to figure out how much time to wait before dropping the objection.
4. It's very easy to forget to add the delay, leading to wasted debug time.

What UVM also provides is a "drain time" mechanism. After all objections have been dropped, the simulation end is delayed by the drain time configured by the user. The cool thing about it is that it can be set once in the base test and other tests don't need to take care of it anymore. A good place to do it is before the run phase starts, in either one of the *end_of_elaboration_phase(...)* or the *start_of_simulation_phase(...)* functions:

```verilog
class test_drain_time extends test;
  virtual function void end_of_elaboration_phase(uvm_phase phase);
    uvm_phase run_phase = uvm_run_phase::get();
    run_phase.phase_done.set_drain_time(this, 16 * 2);
  endfunction

  // ...
endclass
```

The drawback here is, as in the previous case, that we are specifying the duration in simulation steps, not clock cycles. Moreover, in this case, the actual delay will be done by code in the UVM package. This means the time settings used when compiling UVM will be taken into account, so it might get really funky when working with a pre-compiled library from a vendor (which is usually the case).

The best thing would be if the scoreboard itself could decide when to allow the test to stop. What it could do is raise an objection whenever a north side item is received. This means that the DUT is processing something. Once a south side item comes out, it can drop an objection. Since (ideally) the number of north and south side items should match, once the DUT is done processing everything the scoreboard should drop all of its objections:

```verilog
class scoreboard_with_objection extends apb_pipeline_tb::scoreboard;
  virtual function void write_north(apb_pkg::apb_mon_item item);
    uvm_phase run_phase;

    super.write_north(item);
    if (num_seen_north_items % 2 == 1)
      return;

    run_phase = uvm_run_phase::get();
    run_phase.raise_objection(this);
  endfunction


  virtual function void write_south(apb_pkg::apb_mon_item item);
    uvm_phase run_phase;

    super.write_south(item);
    if (num_seen_south_items % 2 == 1)
      return;

    run_phase = uvm_run_phase::get();
    run_phase.drop_objection(this);
  endfunction

  // ...
endclass

```

The great thing about this approach is that it works regardless of what pipeline depth we have. The only reason why someone might not want to implement a scoreboard like this is if they hang out too much . The guys at Mentor Graphics say that raising objections in any place other than the test is a performance killer, particularly if its done on a per item basis, like we have here. This is because objections have to propagate throughout the hierarchy, which can take a significant toll on the simulator. In a toy example like this one it's probably not going to make much of a dent, but I can imagine that things can go overboard fast when dealing with complicated designs with many interfaces. With the (rather) new UVM 1.2 release, objections have gotten leaner, so the argument might not hold up anymore.

If you have a really big design and you're stuck using UVM 1.1, don't despair! There is a way to leave the scoreboard in control of when to end the test, without having to raise and drop objections for each item it gets. Each *uvm_component* has a *phase_ready_to_end(...)* function that is called before the phase is stopped. If our scoreboard still has items queued when the test sequence finishes, it can raise an objection to delay the end of the simulation. Once the queue becomes empty, it can drop the objection and allow the test to end:

```verilog
class scoreboard_with_phase_ready_to_end extends apb_pipeline_tb::scoreboard;
  virtual function void phase_ready_to_end(uvm_phase phase);
    if (phase.get_name != "run")
      return;

    if (item_stream.size() != 0) begin
      phase.raise_objection(this);
      fork
        delay_phase_end(phase);
      join_none
    end
  endfunction


  virtual task delay_phase_end(uvm_phase phase);
    wait (item_stream.size() == 0);
    phase.drop_objection(this);
  endtask

  // ...
endclass

```

This combines the best of both worlds. It works regardless of pipeline depth, since we don't have to specify any kind of delay. It's also very efficient in terms of performance, since we don't need to execute anything for each item that the scoreboard receives. We only need to fork the drain task in the last stage of the simulation, which should have a negligible impact on the run time. There is one caveat, though. In more complicated testbenches, it might be the case that multiple components want to delay the end of the test. This could lead to situations where all objections for the run phase (for example) are dropped, *phase_ready_to_end(...)* gets called and a component decides to prolong the phase by raising another objection, eventually drops it, *phase_ready_to_end(...)* gets called again, another component wants to prolong the phase, and so on. If this process repeats too many times, a fatal error is flagged, Such a situation shouldn't happened very often in practice.

These are the ways of handling end-of-test that currently come to mind. If I missed anything, do let me know in the comments section.  Out of all outlined methods, using *phase_ready_to_end(...)*seems to be the best by far. I'm definitely using it in my future projects.