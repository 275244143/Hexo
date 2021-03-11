---
title: 'uvm:finish_on_completion'
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-11 09:47:00
---



### QA

I observed a code in TB ::



```
initial  begin
 
   run_test("sanity_test") ; 
   $display(" test finishes");
 
end
```

The $display() statement after run_test() doesn't get displayed due to Implicit call to $finish

So just for coding purpose I decided to have the display statement executed ::



```verilog
`include "uvm_pkg.sv"
`include "uvm_macros.svh" 
 
import uvm_pkg::*;
 
module  top_tb ;
 
 
    class test1 extends uvm_test ;
       `uvm_component_utils (test1)
 
       function new (string name , uvm_component parent );
          super.new (name, parent);
       endfunction
 
       virtual function void build_phase (uvm_phase phase);
 
          `uvm_info(get_name,$sformatf(" In build_phase() of test1 "),UVM_NONE)
 
       endfunction
 
    endclass
 
     initial  begin
 
         uvm_top.finish_on_completion = 0  ;
 
         run_test("test1");
 
         $display(" I want  to   Observe  this ") ;
 
         $finish ;
 
     end
```

But I still don't observe the display

**UVM_INFO @ 0: reporter [RNTST] Running test test1...UVM_INFO @ 0: uvm_test_top [uvm_test_top] In build_phase() of test1**

**Any thoughts why I don't see the display statement ?**



### ANS

```verilog
initial  begin
 
         uvm_root top;
 
         top = uvm_root::get();
 
         top.finish_on_completion = 0  ;
 
         run_test("test1");
 
         $display(" I want  to   Observe  this ") ;
 
         $finish ;
 
     end
```

