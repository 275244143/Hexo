---
title: get_objection_total
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-16 09:35:37
---



### QA

If you refer to the UVM reference for uvm_objection, you will find the following for drop_objection():

If the total objection count reaches zero, propagation up the hierarchy is deferred until a configurable drain-time has passed and the uvm_component::all_dropped callback for the current hierarchy level has returned.

This means that there is a forked process which waits for the drain-time to complete, and then the objection drop is propagated up the hierarchy. This forked task requires you to block until completion.

You can modify your code to wait for this:

## ANS

```verilog
module tb_top();
 
  Parent parent;
  uvm_objection my_obj;
 
  initial begin
    my_obj = new("obj2");
    parent = new("parent", null);
    assert(my_obj.get_objection_total(parent) == 0);
    my_obj.raise_objection(parent.child);
    assert(my_obj.get_objection_total(parent) == 1);
    my_obj.drop_objection(parent.child);
    wait (my_obj.get_objection_total(parent) == 0);  // Blocking until objection dropped
    assert(my_obj.get_objection_total(parent) == 0);
  end
endmodule
```

