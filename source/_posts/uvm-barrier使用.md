---
title: uvm_barrier使用~
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-08-14 14:04:28
---

UVM提供uvm_barrier对多个组件进行同步协调，同时为了解决组件独立运作的封闭性需要，定义了新的类uvm_barrier_pool来全局管理uvm_barrier对象。

uvm_barrier 可以设置一定的等待阈值，仅在有不少于该阈值的进程在等待该对象时才会触发该事件，同时激活所有正在等待的进程，使其基础进行。 

**wait_for**	              Waits for enough processes to reach the barrier before continuing.
**reset**	                    Resets the barrier.
**set_auto_reset**	   Determines if the barrier should reset itself after the threshold is reached.
**set_threshold**	     Sets the process threshold.
**get_threshold**	     Gets the current threshold setting for the barrier.
**get_num_waiters**	Returns the number of processes currently waiting at the barrier.
**cancel**	                   Decrements the waiter count by one.


例子：

```verilog
//----------------------------------------------------------------------
//component1
//----------------------------------------------------------------------

class comp1 extends uvm_component;
  uvm_barrier b1;
  ...
  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    b1 = uvm_barrier_pool::get_global("b1");
  endfunction
  task run_phase(phase);
    #5ns;
    b1.wait_for();
  endtask
endclass

//----------------------------------------------------------------------
//component2
//----------------------------------------------------------------------

class comp2 extends uvm_component;
  uvm_barrier b1;
  ...
  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    b1 = uvm_barrier_pool::get_global("b1");
  endfunction
  task run_phase(phase);
    #10ns;
    b1.wait_for();
  endtask
endclass
//----------------------------------------------------------------------
//env
//----------------------------------------------------------------------

class env extends uvm_env;
  comp1 c1;
  comp2 c2;
  uvm_barrier b1;
  ...
  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    c1 = comp1::type_id::create("c1",this);
    c2 = comp1::type_id::create("c2",this);
    b1 = uvm_barrier_pool::get_global("b1");
  endfunction

  task run_phase(phase);
    b1.set_threshold(3);
    #20ns;
    b1.set_threshold(2);
    `uvm_info("BAR",$sformatf("set b1 thrd %0d at %0t fs",b1.get_threshold(),$time),UVM_NONE)
  endtask
endclass
```
为了同步c1和c2而定义了b1,b1为c1,c2和env共享。c1和c2通过wait_for()来等待激活，env通过设置阈值来调控“开闸”的时间。