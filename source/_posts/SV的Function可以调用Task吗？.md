---
title: SV的Function可以调用Task吗？
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-05-22 14:55:10
---

+ SV要求
nonblocking assignments, event triggers, clocking drives, and fork-join_none constructs shall be allowed inside a function.
代码例子：
```verilog

`timescale 1ns/1ps

module DetachThreadTB;

task rw_task(byte addr,output byte data);
    #10ns;
    data = addr + 1;
    $display("%m:%h",data);
endtask

function byte rw_func(byte addr);
    byte data; 
    fork
        rw_task(addr,data);
    join_none
    return data;
endfunction

initial begin
    byte data ;
    data = rw_func(100);
    $display("rw_func:%h",data);
end

endmodule
```
+ 输出

  ```verilog
  rw_func:00
  DetachThreadTB.rw_task:65
  ```

  

+ 结论
主要是为了边际效应，可以在多线程中通道中操作等。
