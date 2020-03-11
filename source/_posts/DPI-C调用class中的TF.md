---
title: DPI-C调用class中的TF
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-03-11 09:38:59
---

### 代码demo

You can create a static instance of your sequence, then you will be able to access it from outside of the class.

```verilog
class my_seq extends uvm_sequence;
  static my_seq handle_m;
 
  `uvm_object_utils(my_seq)
 
  function new(string name="my_seq");
    super.new(name);
    if(handle_m == null) begin
      handle_m = this;
    end
  endfunction : new
 
  task t1();
    // access sequencer using m_sequencer for example
  endtask
  // ...
endclass
 
 
task t2();
  my_seq::handle_m.t1();
endtask
```

t2 task is called from C-DPI, then it can access t1() inside the seq class using static instance.

