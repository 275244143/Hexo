---
title: time unit in the set_timeout()
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-01-28 10:11:04
---



### QA

Need some clarification on the time value passed to uvm_top.set_timeout() call.
I want to use this feature to terminate the sim when it fails to finish before 1ms, and when I add the line,
initial uvm_top.set_timeout(1ms); in the top module and run the sim, it terminates at 1000ns instead of 1ms with the fatal error,

UVM_FATAL @1000.000ns: reporter.*Explicit timeout of 1000.000ns hit, indicating a probable testbench issue.

If I set the time value in ps unit as in set_timeout(1.0e9), it works. Any idea?



@@@

set_timeout() should be sensitive to the time unit provided because it takes the argument as data type “time”.

*function void set_timeout(time timeout, bit overridable = 1)*

My expectation is if input is provided with a unit(4ms), it should run for that much time irrespective of timescale set in testbench. Am I missing something?

In my test, set_timeout(4ms) is present. Test bench has timescale of 1fs/1fs. Because of this, 4ms is working as 4us. If I change this to set_timeout(4ms/1ps) as you have suggested, it might work. But, if any other test bench has other timescales, then it needs to be changed again. In this way, it will be test bench timescale dependent. How to make this independent of timescale?



@@@

I've just tried to use set_global_timeout() in my testbench and noticed some strange behaviour. I was hoping someone could point out the gotcha that I'm missing.

I assumed that in order to set a watchdog timeout value of 1us, I would need to add the following line to my build() function:
set_global_timeout(1us);

However, this doesn't have the desired effect. Instead the time units don't seem to be being obeyed and are out by a factor of 1000.

set_global_timeout(1s) results in a timeout after 1ms.
set_global_timeout(1ms) results in a timeout after 1us. set_global_timeout(1us) results in a timeout after 1ns.
set_global_timeout(1ns) results in a timeout after 1ps.
set_global_timeout(1000) results in a timeout after 1ns.
set_global_timeout(1000000) results in a timeout after 1us.



### ANS

%%% 

There is nothing special about the time data type; it is just a 64-bit unsigned integer. Please read the link to the other question.



%%%

Communicating time values across multiple timescale domains has been a *gotcha* in Verilog since day one. Timescales only apply to scaling of literal time values, not values of variables or passed arguments. Therefore, you should always use a literal time value in any expression involving time to a normalized time unit.

Unfortunately, they didn't do this inside the OVM library. So if your OVM package is compiled with a default of timescale of 1ps, then you should do this to normalize it :

set_global_timeout(1us/1ps);





### 补充一点

#UVM_RUN_SETTING += +UVM_RUN_SETTING += +UVM_TIMEOUT=1000000000,YES

   set_report_max_quit_count(50);
    uvm_top.set_timeout(1s/1ps, 1);
    uvm_top.set_report_max_quit_count(200);



1ps是UVM/OVM库编译的最小单位~~~