---
title: Interrupt Handling in UVM
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-08-13 09:32:37
---

**Interrupt handling** is a well known feature of any SoC which usually comprises of CPU, Bus Fabric, several Controllers, Sub-Systems & many IP blocks as part of it. In some way or other Interrupts are used to act as the sideband signals of the Design/IP Blocks & most of time its not the part of main bus or control bus.

**Fundamentally, Interrupts are the events which triggers a new thread of processing.** Usually Interrupt acts in a System or Sub-System environment, where Design or IP blocks generates an event once certain design conditions are met or fulfilled. These events might be expected to propagate to the CPU via Interrupt Controller. An **Interrupt Controller**helps to manage several interrupts from different IPs, prioritize or arbitrate these interrupts. Interrupt Controller can be configured to enable & disable interrupts & can accept multiple interrupt request lines.

Coming back to the role of Interrupts in a System – it triggers a new thread of processing. This new thread which is usually called the **Interrupt Service Routine (ISR)** can either take the place of current execution thread, or it can be used to wake up a sleeping process to initiate some hardware activity.

Now, lets see how using UVM the Interrupt Service Routine is serviced when an interrupt is asserted. The simplest way to model interrupt handling is to trigger the **execution of a Sequence** that uses the **grab()**method to get the exclusive access of the **Sequencer**. In this way the current stimulus generation is disrupted but this is actually what happens when an ISR is triggered on a CPU. The interrupt service routine that is represented in the form of a **Sequence** can not be interrupted itself, & must make an **ungrab()** call before it completes.

Now lets see it through an example of UVM code below:

------

```verilog
///// Top-Level Sequence
class top_level_seq extends uvm_sequence #(transaction);
 `uvm_object_utils(top_level_seq)
 
 function new (string name);
 super.new(name);
 endfunction: new
 
 task body;
  /// Sequence instantiation
 main_seq MAIN_SEQ;
 isr ISR;
 
 /// Interrupt specific configuration class
 int_config INT_CONF;
 
 MAIN_SEQ = main_seq::type_id::create("MAIN_SEQ", this);
 ISR = isr::type_id::create("ISR", this);
 if (!uvm_config_db #(int_config)::get(null, get_full_name(), "int_confir", INT_CONF)) begin
 `uvm_error("TOP SEQ BODY", "Failed to get int_config");
 end
 
 /// Two level of forked process
 fork
   PRI_SEQ.start(m_sequencer);
    begin
     forever begin
      fork
        INT_CONF.wait_for_IRQ0();
        INT_CONF.wait_for_IRQ1();
        INT_CONF.wait_for_IRQ2();
        INT_CONF.wait_for_IRQ3();
      join_any
      disable fork;
      ISR.start(m_sequencer)
    end
  end
 join_any
 disable fork;
endtask: body
 
endclass: top_level_seq
```

------

This is the top level sequence i.e. **top_level_seq** which controls both main Sequence i.e. **main_seq** and Interrupt Service Routine (ISR) Sequence i.e. **isr**. In the main sequence a configuration class i.e. **int_config** is instantiated that contains the **hardware synchronization tasks** for the interrupts i.e. **wait_for_IRQx()**. To know more in detail about hardware synchronization tasks, please refer my previous post titled Wait for Interface Signals in UVM.

The most important piece of the main sequence is the **two level forked process**. **In the first level**, primarily two processes are spawned – The main sequence & the Interrupt assertion on any one of the Interrupts out of four possibilities i.e. IRQ1-IRQ4. **Second level** of fork process is encapsulated in a **forever** loop. Once an Interrupt is sensed, other second level processes (IRQx) are disabled using **disable fork** and active Interrupt is serviced & finally due to forever loop, all the 4 second level of processes are spawned again to poll the interrupts.

Once the main sequence is over, there is no point of keep running and waiting for the interrupts, hence the **fork..join_any** process is disabled using **disable fork** at the first level**.**

Now lets examine the code for 2 other Sub-Sequences below:

------

```verilog
///// Main Sequence
class main_seq extends uvm_sequence #(transaction);
 `uvm_object_utils(main_seq)
  
 function new (string name);
  super.new(name);
 endfunction: new
 
 task body;
 
 transaction req;
  req = transaction::type_id::create("transaction", this);
 
 repeat(150) begin
 start_item(req);
 if (!req.randomize() with {addr inside {[32'h0010_0000:32'h0010_001C]}; read_not_write == 0;}) begin
 `uvm_error("MAIN SEQ BODY", "req randomization failure")
 end
 finish_item();
 end
 endtask: body
 
endclass: main_seq

///// ISR Sequence
class isr extends uvm_sequence #(transaction);
 `uvm_object_utils(isr)
 
 function new (string name);
  super.new(name);
 endfunction: new
 
 /// Request data
 rand logic [31:0] addr;
 rand logic [31:0] write_data;
 rand bit read_not_write;
 rand int delay;
 /// Response data
 bit error;
 logic [31:0] read_data
 
 task body;
 transaction req;
 
 /// Grabbing the sequencer
 m_sequencer.grab(this);
 
 req = transaction::type_id::create("transaction", this);
 
 ///Read from the status register to determine the cause of interrupt
 if(!req.randomize() with {addr == 32'0010_0000; read_not_write == 1;}) begin
 `uvm_error("INT SEQ BODY", "randomization failure")
 end
 start_item(req);
 finish_item(req);
 
 /// Clear the IRQ bit
 req.read_not_write = 0;
 if(req.read_data[0] == 1)
 begin
 `uvm_info("ISR SEQ BODY", "IRQ[0] detected", UVM_LOW)
 req.write_data[0] = 0;
 start_item(req);
 finish_item(req);
 `uvm_info("ISR SEQ BODY", "IRQ[0] cleared", UVM_LOW)
 end
 
 if(req.read_data[1] == 1)
 begin
 `uvm_info("ISR SEQ BODY", "IRQ[1] detected", UVM_LOW)
 req.write_data[1] = 0;
 start_item(req);
 finish_item(req);
 `uvm_info("ISR SEQ BODY", "IRQ[1] cleared", UVM_LOW)
 end
 
 if(req.read_data[2] == 1)
 begin
 `uvm_info("ISR SEQ BODY", "IRQ[2] detected", UVM_LOW)
 req.write_data[2] = 0;
 start_item(req);
 finish_item(req);
 `uvm_info("ISR SEQ BODY", "IRQ[2] cleared", UVM_LOW)
 end
 
 if(req.read_data[3] == 1)
 begin
 `uvm_info("ISR SEQ BODY", "IRQ[3] detected", UVM_LOW)
 req.write_data[3] = 0;
 start_item(req);
 finish_item(req);
 `uvm_info("ISR SEQ BODY", "IRQ[3] cleared", UVM_LOW)
 end
 /// Processing the transaction with interrupt line low
 start_item(req);
 finish_item(req);
 
 /// Releasing the Sequencer for the main Sequence
 m_sequencer.ungrab(this);
 
 endtask: body
 
endclass: isr
```

------

In the above UVM code, the main sequence i.e. **main_seq** is pretty straight forward. It is implementing a loop (150 times) in which the **transaction** i.e. **req** is sent to the **UVM Driver** & finally to the **bus interface** for that many times.

**Important** thing to observe in the Interrupt Service Routine (ISR) Sequence i.e. **isr** is the use of **grab()** and **ungrab()** tasks. Another important thing to notice is the **interrupt priority structure**. The written order is important and top entry in IRQ[1]-IRQ[4] i.e. IRQ[1] is serviced first. Other key functional information is provided in the form of comments along with the code, please refer that. Using the grab(), **isr**Sequence takes full control of the Sequencer and perform the defined tasks of the ISR and later once done using ungrab() call, it releases the Sequencer for the main Sequence to continue.