---
title: SV追踪Log的堆栈
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-06-02 11:21:52
---

### 没有堆栈的跟踪定位，有时候真的是不知道错在那个线程的哪个函数里面~

### 采用EDA工具提供的函数实现了~

```verilog 
import uvm_pkg::*;
`include "uvm_macros.svh"

package some_pkg;

    function void rpt_info_f(string ID, MSG, VERBOSITY = UVM_LOW, uvm_report_object OBJ = null);
        if(OBJ == null) begin
            `uvm_info(ID,MSG,VERBOSITY)
            $stacktrace;//vcs:$stack
        end
        else begin
    	    `uvm_info_context(ID,MSG,VERBOSITY,OBJ)
            $stacktrace;//vcs:$stack
        end
    endfunction

function void some_function();
    rpt_info_f("TEST","@@@@",UVM_LOW);
endfunction

function void some_function1();
    some_function();
endfunction

endpackage : some_pkg

module top;
  import some_pkg::*;

  initial begin
    rpt_info_f("TEST","$$$$",UVM_LOW);
    fork
        begin:TEST
            some_function1(); 
        end 
        some_function1(); 
    join
    $finish;
  end

endmodule : top
```

### 输出

```verilog
UVM_INFO tb1.sv(42) @ 0: reporter [TEST] $$$$
Verilog Stack Trace:
0: function worklib.some_pkg::rpt_info_f at ./tb1.sv:43
1: initial block in top at ./tb1.sv:66

UVM_INFO tb1.sv(42) @ 0: reporter [TEST] @@@@
Verilog Stack Trace:
0: function worklib.some_pkg::rpt_info_f at ./tb1.sv:43
1: function worklib.some_pkg::some_function at ./tb1.sv:53
2: function worklib.some_pkg::some_function1 at ./tb1.sv:57
3: process in top.TEST at ./tb1.sv:69

UVM_INFO tb1.sv(42) @ 0: reporter [TEST] @@@@
Verilog Stack Trace:
0: function worklib.some_pkg::rpt_info_f at ./tb1.sv:43
1: function worklib.some_pkg::some_function at ./tb1.sv:53
2: function worklib.some_pkg::some_function1 at ./tb1.sv:57
3: process in top at ./tb1.sv:71
```

