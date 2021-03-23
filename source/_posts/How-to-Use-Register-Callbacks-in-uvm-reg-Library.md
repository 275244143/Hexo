---
title: How to Use Register Callbacks in uvm_reg Library
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-23 09:54:37
---

One very nice feature of uvm_reg is the **register callback extensions**. This is just a fancy name for saying that you can set some action to be executed when a register field is accessed (e.g. clear field A when field B is written with value 1).

So let’s go through the steps required to use this feature.

### Step #1 – Declare a Register Callback Extension

To declare a register callback you have to create a class which extends from *uvm_reg_cbs*:

```verilog
class cfs_dut_cbs_clear_int extends uvm_reg_cbs;
   `uvm_object_utils(cfs_dut_cbs_clear_int)

   //pointer to interrupts register
   cfs_dut_reg_irq ptr_irq;
   
   function new(string name = "");
      super.new(name);
   endfunction

   virtual function void post_predict(
      input uvm_reg_field  fld,
      input uvm_reg_data_t previous,
      inout uvm_reg_data_t value,
      input uvm_predict_e  kind,
      input uvm_path_e     path,
      input uvm_reg_map    map);
      if(kind == UVM_PREDICT_WRITE) begin
         cfs_dut_reg_field reg_field;
         if($cast(reg_field, fld)) begin
            if(reg_field.write_data[0] == 1)
               ptr_irq.ovf.predict(0);
            end
         end
      end
   endfunction
endclass
```

### Step #2 – Connect The Register Callback Extension

Once the register callback class is declared you have to instantiate it and connect it to the corresponding register field.

At step #1 I declared a callback which will clear an overflow interrupt field (ptr_irq.ovf) when value ‘1’ is written to the field containing the callback.

So let’s connect this callback to the “overflow interrupt clear” field:

```verilog
class cfs_dut_env extends uvm_env;
   ...
   function void connect_phase(uvm_phase phase);
      //create an instance of the callback
      cfs_dut_cbs_clear_int cbs = cfs_dut_cbs_clear_int::type_id::create("cbs");
     
      //connect the pointer to "interrupts" register
      cbs.ptr_irq = reg_block.irq;
     
      //connect the callback instance to the "overflow interrupt clear" field
      uvm_callbacks#(uvm_reg_field, cfs_dut_cbs_clear_int)::add(reg_block.irq_clr.ovf, cbs);
   endfunction
endclass
```

And that’s it! Now whenever there is a write with value 1 to reg_block.irq_clr.ovf field reg_block.irq.

### Extra – Dealing with “Write One Clear” Fields

In most of the real cases fields which are clearing other fields are “Write One Clear”.
The problem with these fields is that in the callback class you can not easily determine if the field was written with value ‘1’ because the argument ‘**value**‘ of function **post_predict()** gives the **cleared** value of the field.
For this reason you can implement a custom register field which retains the written value:

```verilog
class cfs_dut_reg_field extends uvm_reg_field;
   `uvm_object_utils(cfs_dut_reg_field)

   time write_time;

   uvm_reg_data_t previous_mirror_value;
   
   uvm_reg_data_t write_data;

   function new(string name = "");
      super.new(name);
      write_time = 0;
      previous_mirror_value = 0;
   endfunction

   virtual function void do_predict(uvm_reg_item rw,
      uvm_predict_e kind = UVM_PREDICT_DIRECT, uvm_reg_byte_en_t be = -1);
      uvm_reg_data_t local_previous_mirror_value = get_mirrored_value();
      if(kind == UVM_PREDICT_WRITE) begin
         write_data = rw.value[0];
      end

      super.do_predict(rw, kind, be);

      if(kind == UVM_PREDICT_WRITE) begin
         previous_mirror_value = local_previous_mirror_value;
         write_time = $time;
      end
   endfunction
endclass
```

When you declare the “interrupts clear” register you just use this new register field class:

```verilog
class cfs_dut_reg_irq_clr extends uvm_reg;
   ...
   rand cfs_dut_reg_field ovf;
   ...
endclass
```

That’s it! Hope you found this information useful 