---
title: Wait for Interface Signals in UVM
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-08-13 09:35:20
---

In normal scenarios the synchronization of hardware events, like clocks, resets, error signals, interrupts etc., primarily takes place inside the UVM Driver & Monitors for an UVM Testbench.

But there are certain conditions, some of them are listed below, which requires systematic handling of these interface signals because handling of these interface signals inside Driver, Monitor or Component is not sufficient to achieve the intended functionality.

Examples of certain conditions to handle interface signals outside Drivers & Monitors could be as described below:

- Providing **clock based delay** between transmitted Transaction items inside the Sequence (Accessing Virtual Interface signals inside Sequence)
- To ignore the coverage data collected during an **error condition** which are based on error signals
- To trigger another Sequence (ISR) after receiving an **interrupt**
- To wait for **reset** before sampling any valid data on the Analysis side of the UVM testbench.

Hence from the above mentioned specific conditions, its obvious that we need a systematic approach to handle interface signals to support these conditions where a dynamic object like Sequence may depend on the interface signal’s state for the next action to be taken.

Well, this requirement could be fulfilled by adding  **hardware synchronization methods** (corresponding to the interface signals) to the **Configuration Object** which will also contains the **Virtual Interface**. These methods blocks until a hardware event occurs on the Virtual Interface. Examples of these hardware synchronization methods could be:

- **wait_for_clock()**
- **wait_for_reset()**
- **wait_for_interrupt()**
- **interrupt_cleared()**

Now, in order to use these hardware synchronization methods inside the configuration object, the **Sequence** or the **Components** must first ensure that it has a valid pointer to the configuration object.

The pointer may already have been set during construction OR it may require Sequence or Component to call **get_config()** static method. Once the local configuration object pointer is set & valid, the hardware synchronization methods can be accessed using the **configuration object handle**.

Lets see this approach by using UVM example code below:

------

```verilog 
///// Transaction Class
class transaction extends uvm_sequence_item;
 `uvm_object_utils(transaction)
 
 rand logic [31:0] addr;
 rand logic [31:0] write_data;
 rand bit read;
 rand int delay;
 
 bit error;
 logic [31:0] read_data;
 
 function new (string name);
 super.new(name);
 endfunction: new
 
 constraint at_least_1 { delay inside {[1:20]};}
 
 constraint 32bit_align {addr[1:0] == 0;}
 
endclass: transaction

///// Bus Configuration Object
class bus_config extends uvm_object;
 `uvm_object_utils(bus_config)
 
 virtual bus_interface bus_if;
 
 function new (string name);
 super.new(name);
 endfunction: new
 
 /// wait_for_clock
 task wait_for_clock( int m = 1 );
 repeat ( m ) begin
 @(posedge bus_if.clk);
 end
 endtask: wait_for_clock
 
 /// wait_for_reset
 task wait_for_reset;
 @(posedge bus_if.reset);
 endtask: wait_for_reset
 
endclass: bus_config

///// Bus Sequence
class bus_seq extends uvm_sequence #(transaction);
 `uvm_object_utils(bus_seq)
 
 transaction txn;
 bus_config bus_cfg;
 
 rand int limit = 25;
 
 function new (string name);
 super.new(name);
 endfunction: new
 
 task body;
 int i = 5;
 txn = transaction::type_id::create("txn", this);
 /// Get the Configuration object
 if(!uvm_config_db #(bus_config)::get(null, get_full_name(), "config", bus_cfg)) begin
 `uvm_error(" SEQ BODY ", "bus_config is not found")
 end
 
 repeat (limit)
 begin
 start_item(txn);
 if(!txn.randomize() with {addr inside {[32'h0010_0000:32'h0010_001C]};}) begin
 `uvm_error(" SEQ BODY ", " Transaction randomization failed")
 end
 finish_item(txn);
 /// wait for interface clock
 bus_cfg.wait_for_clock(i);
 i++;
 /// The txn handle points to the object that the driver has updated with response data
 `uvm_info(" SEQ BODY ", " txn.read_data ", UVM_LOW)
 end
 endtask: body
 
endclass: bus_seq
```

------

From the above example we can see that inside the **Transaction class i.e. “transaction”**, we declared all the **request** and **response** data members. We also define the constraints inside it.

Next, there is a **Configuration Object** is being declared i.e. “**bus_config**“. Here we can define our **hardware synchronization methods** e.g. **wait_for_clock** & **wait_for_reset** to be used in the UVM Testbench. Virtual Interface i.e. “**bus_if**” is also declared inside “**bus_config**“.

Finally inside a Sequence called “**bus_seq**” both Transaction & Config Classes are instantiated. Transaction is **constructed** and Configuration Object is fetched using the **get config** method to set the valid pointer. Once its done, “**wait_for_clock” method** is called using the configuration object **handle** i.e. “**bus_cfg**“. By this way, we’re able to access the clock signal defined in the Virtual Interface inside a Sequence.

In the present example, delay between two transaction item transmission will be gradually increased with every loop.