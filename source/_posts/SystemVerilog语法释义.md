---
title: SystemVerilog语法释义
date: 2019-04-16 16:08:43
tags: [UVM,SystemVerilog]
categories: 验证
---
## 1.浮点数转换

### ieee1800-2017解释：

	Real numbers shall be converted to integers by rounding the real number to the nearest integer, rather than by truncating it. 
	Implicit conversion shall take place when a real number is assigned to an integer. 
	If the fractional part of the real number is exactly 0.5, it shall be rounded away from zero.
	
<font color=red>
代码例子：
    	
    int x_int;	
    x_int = 2.4;//x_int --> 2
    x_int = 2.5;//x_int --> 3
    x_int = int'(2.5);//x_int --> 2 
    
</font> 


​	
