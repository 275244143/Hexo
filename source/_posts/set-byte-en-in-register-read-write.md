---
title: set byte_en in register read/write
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-02-25 17:27:25
---



### How can i set byte_en in register read/write?

#### ANS

You have to set the corresponding field in the configure method. The last argument has to be set to '1' like this
```verilog
configure(this, 1, 15, "RO", 0, 0, 1, 0, 1 );
```
And you have to specify this in the reg2bus function of the adapter like this:

```verilog
virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
....
foreach (rw.byte_en[i])
      trans.byte_enable[i] = rw.byte_en[i];
```

In the constructor of the adapter you have to set the corresponding bit

```verilog
this.supports_byte_enable = 1;
```

