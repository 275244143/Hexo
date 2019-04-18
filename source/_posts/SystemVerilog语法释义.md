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
	
<font color=blue>
代码例子：
<pre name="code" class="systemverilog">     	
int x_int;	
x_int = 2.4;//x_int --> 2
x_int = 2.5;//x_int --> 3
x_int = int'(2.5);//x_int --> 2 
</pre>   
</font> 

## 2.数据比特位快速反转
<font color=blue>
代码例子：
<pre name="code" class="systemverilog">  	
bit [15:0] x = 16'b0000_1011_0000_0011;
x= { << {x} }; //x --> 16'b1100_0000_1101_0000;
</pre>
</font> 

## 3.super.super如何解决无法支持问题？
<font color=blue>
代码例子：
<pre name="code" class="systemverilog">  	
module tb;

class A;
    virtual function void test();
        $display("%m");
    endfunction
endclass

class B extends A;
    virtual function void test();
        $display("%m");
    endfunction
endclass

class C extends B;
    virtual function void test();
        super.test();//Call B test()
        //super.super.test();//error!Can not support！
        //use follow
        A::test();//Call A test()
        $display("%m");
    endfunction
endclass

initial begin
    C cinst = new();
    cinst.test();
end

endmodule

仿真执行结果：
tb.B.test
tb.A.test
tb.C.test

</pre>
</font> 