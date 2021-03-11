---
title: simulation delay after UVM_MAX_QUIT_COUNT
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-02-02 09:43:31
---



### add simulation delay after UVM_MAX_QUIT_COUNT reached

```verilog
class my_report_catcher extends uvm_report_catcher;
  int unsigned max_error = 1; // limit
  time fatal_timeout = 20ns; // amount to delay before exiting
  function new (string name = ""); super.new(name); endfunction
  function action_e catch; 
    if (get_severity() == UVM_ERROR  && --max_error == 0) // short-circuit && operator
      fork 
        #fatal_timeout get_client().die();
      join_none
    return THROW;
  endfunction
endclass : my_report_catcher
```


Then in your test

```verilog
my_report_catcher rc_h;
rc_h = new("rc");
rc_h.max_error = 10;
rc_h.fatal_timeout = 100ms;
uvm_report_cb::add(null, rc_h); // all errors in all contexts
```


P.S. UVM calls die() when reaching MAX_QUIT_COUNT.

