---
title: How to Startup uvm_reg SystemVerilog Library
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-23 09:37:54
---

In this post I will describe all the steps **I take** to startup the uvm_reg register model. If you do things differently and you think your method is better write a comment. If I agree with your idea I will change my flow too.



Here we go:

### Step #1 – Declare Each Register Model

In uvm_reg each register is modeled by a predefined class called *uvm_reg*. All the fields of the register are modeled with a class called *uvm_reg_field*. See an example below:

```verilog
class cfs_dut_reg_ctrl extends uvm_reg;

   //reserved
   rand uvm_reg_field reserved;

   //control for enabling the DUT
   rand uvm_reg_field enable;

   `uvm_object_utils(cfs_dut_reg_config)

   function new(string name = "cfs_dut_reg_config");
      //specify the name of the register, its width in bits and if it has coverage
      super.new(name, 32, 1);
   endfunction

   virtual function void build();
      reserved = uvm_reg_field::type_id::create("reserved");
      //specify parent, width, lsb position, rights, volatility,
      //reset value, has reset, is_rand, individually_accessible
      reserved.configure(this, 31, 1, "RO", 0, 0, 1, 1, 1);

      enable = uvm_reg_field::type_id::create("enable");
      enable.configure(this, 1, 0, "RW", 0, 0, 1, 1, 1);
   endfunction
endclass
```

You can control a lot of parameters of the field but most important are:



- field width in bits

- position of its least significant bit

- field access rights

- field reset value

### Step #2 – Instantiate the Registers in a Register Block

  In uvm_reg the registers can be contained in two classes: *uvm_reg_file* and *uvm_reg_block*.
  I think that the most common approach is to add the registers in the register block:

```verilog
class cfs_dut_reg_block extends uvm_reg_block;
   `uvm_object_utils(cfs_dut_reg_block)

   //Control register
   rand cfs_dut_reg_ctrl ctrl;

   //Status register
   rand cfs_dut_reg_status status;

   function new(string name = "cfs_dut_reg_block");
      super.new(name, UVM_CVR_ALL);

      ctrl = cfs_dut_reg_ctrl::type_id::create("ctrl");
      status = cfs_dut_reg_status::type_id::create("status");
   endfunction

   virtual function void build();
      ctrl.configure(this, null, "");
      ctrl.build();

      status.configure(this, null, "");
      status.build();
      ...
   endfunction
endclass
```

### Step #3 – Add the Registers to an Address Map

In uvm_reg library an address map (class *uvm_reg_map*) models the register access via a physical interface like APB or UART.
Because of this, all registers which can be accessed via a particular interface must be added to the corresponding address map.
**If one register can be accessed via two physical interfaces then it must be added to two address maps.**

```verilog
class cfs_dut_reg_block extends uvm_reg_block;
   ...
   virtual function void build();
      ...
      default_map = create_map("apb_map", 'h0, 1, UVM_BIG_ENDIAN);
      default_map.set_check_on_read(1);

      map.add_reg(ctrl, 'h00, "RW");
      map.add_reg(status, 'h04, "RO");

      lock_model();
   endfunction
endclass
```

### Step #4 – Create the Register Adapter

In order to connect a register model with a physical interface you must transform the classes modeling the physical interface to a transfer which uvm_reg can work with.
This is done via the adapter class called uvm_reg_adapter. It has two important functions which you must implement.



- **reg2bus()** – which transforms a UVM register operation (uvm_reg_bus_op) to a physical protocol sequence item
- **bus2reg()** – which transformed the item coming from the physical protocol monitor to an UVM register operation



One important thing here: you must be careful that when you develop the physical monitor, the collected information must stay in a class which extends from uvm_sequence_item. Otherwise you will not be able to connect the monitor to the register model.

Here is an example of an adapter implementation:

```verilog
class cfs_dut_reg_adapter extends uvm_reg_adapter;
   `uvm_object_utils(cfs_dut_reg_adapter)

   function new(string name = "cfs_dut_reg_adapter");
      super.new(name);
   endfunction
       
   virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
      acme_apb_drv_transfer transfer = acme_apb_drv_transfer::type_id::create("transfer");

      if(rw.kind == UVM_WRITE) begin
         transfer.direction = APB_WRITE;
      end
      else begin
         transfer.direction = APB_READ;
      end
           
      transfer.data = rw.data;
      transfer.address = rw.addr;
     
      return transfer;
   endfunction
       
   virtual function void bus2reg(uvm_sequence_item bus_item, ref uvm_reg_bus_op rw);
      acme_apb_mon_transfer transfer;
           
      if($cast(transfer, bus_item)) begin
         if(transfer.direction == APB_WRITE) begin
            rw.kind = UVM_WRITE;
         end
         else begin
            rw.kind = UVM_READ;
         end

         rw.addr = transfer.address;
         rw.data = transfer.data;
         rw.status = UVM_IS_OK;
      end
      else begin
         `uvm_fatal(get_name(), $sformatf("Could not cast to acme_apb_mon_transfer: %s",
            bus_item.get_type_name()))
      end
   endfunction
endclass
```

### Step #4 – Connect the Address Map to the Bus Agent

The class in charge with getting information from the monitor and trigger register model operations is the predictor – uvm_reg_predictor. Usually, the default implementation of the UVM predictor is enough.
Here is an example how to instantiate and connect the adapter and the predictor.

```verilog
class cfs_dut_env extends uvm_env;
   
   //register block
   cfs_dut_reg_block reg_block;

   //APB agent
   acme_apb_agent apb_agent;

   //APB register adapter
   cfs_dut_reg_adapter adapter;

   //APB register predictor
   uvm_reg_predictor#(acme_apb_mon_transfer) predictor;

   `uvm_component_utils(cfs_dut_env)

   function new(string name = "cfs_dut_env", uvm_component parent);
      super.new(name, parent);
   endfunction
       
   virtual function void build_phase(uvm_phase phase);
      super.build_phase(phase);
     
      //create all the elements of the environment
      reg_block = cfs_dut_reg_block::type_id::create("reg_block");
      apb_agent = acme_apb_agent::type_id::create("apb_agent", this);
      adapter = cfs_dut_reg_adapter::type_id::create("adapter");
      predictor = uvm_reg_predictor#(acme_apb_mon_transfer)::type_id::create("predictor", this);

      reg_block.build();
      reg_block.reset("HARD");
   endfunction

   virtual function void connect_phase(uvm_phase phase);
      super.connect_phase(phase);
     
      //required to start physical register accesses using the registers
      reg_block.default_map.set_sequencer(apb_agent.sequencer, adapter);
     
      predictor.map = reg_block.default_map;
      predictor.adapter = adapter;
      apb_agent.monitor.output_port.connect(predictor.bus_in);
       //reg_block.default_map.set_auto_predict(1);
       //adapter.provides_responses = 1;
       //adapter.supports_byte_enable = 1;
   endfunction
endclass
```

**At this point your register model is up and running.**

Based on your DUT functionality there are more things that you might use from the uvm_reg.
Here are some uvm_reg features that I used so far.