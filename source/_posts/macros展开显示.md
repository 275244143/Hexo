---
title: macros展开显示
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-09-01 16:32:30
---

## QA

example :

`define A1 x
`define A2 `A1.y
`define A3 `A2.z

So I want to print full hierarchy like x.y.z when I print A3.



## ANS

```verilog
`define A1 x
`define A2 `A1.y
`define A3 `A2.z
 
`define STRING(x) `"x`"
 
module top;
  initial $display(`STRING(`A3));
endmodule
```