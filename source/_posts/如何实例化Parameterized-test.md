---
title: 如何实例化Parameterized test
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-07-22 09:46:46
---



### 不错，就转载一下。

I have a few questions regarding parameterized test ( which would act as uvm_test_top )

```verilog
`include "uvm_macros.svh"
`include "uvm_pkg.sv"
 import uvm_pkg::*;
 
class my_test # ( type T = int , T par = 10 ) extends uvm_test ;
 
 `ifdef M1 `uvm_component_param_utils ( my_test#(T,par) ) `endif 
 `ifdef M2 
    `uvm_component_registry ( my_test#(T,par) , $sformatf("my_test_%0s_%0d",$typename(T),par)  )  // [A] 
 
    const static string type_name = {"my_test#(",$sformatf("my_test_%0s_%0d",$typename(T),par),")" } ; 
    // NOTE :: Overriding Property [ 2 type_name exists (a) type_name (b) super.type_name() ] !!
 
     function string get_type_name() // NOTE :: Error to declare it as static , Virtual ( in uvm_test ) by default !!    
          return type_name ;
     endfunction
 `endif
 
  function void build_phase ( uvm_phase phase ) ;
    `uvm_info(get_name(),$sformatf(" type_name is ",type_name),UVM_NONE) // [B] 
  endfunction
endclass
 
module TOP ;
 
// Make Specialized Class
my_test #(int,10) top1 ;
my_test #(int,20) top2 ;
 
initial begin
   run_test("my_test_int_20"); 
end
 
```

[1] Using +define+M1 :: It's unable to create a component since its not registered with the factory . Is there a way around ?

[2] Using +define+M2 I see discrepancy across simulators ( Not the EDA ones , but the licensed ones at work ) .
Some are able to create instance of my_test#(int,20) while others flash "Class specialization parameter must be constant" at line [A] above .

[3] Using `uvm_component_param_utils , user needs to create own type_name variable and get_type_name function .
Is there a helper macro for this ?

[4] If I want to run specialized test via command line +UVM_TESTNAME= , what should ARG be given as ?

[5] Can I use text substitution macro `"T`" in [A] above instead of $typename(T) ?



### 回答

1. You can manually create the top level instance.

   ```verilog
   module TOP ;
     uvm_test top;  
     initial begin
       top = my_test #(int,10)::type_id::create("my_test_int_10",null);
       run_test(""); 
     end
   endmodule
   ```

   If you want command line control, you would have to look at your own switch instead of using +UVM_TESTNAME

   ```verilog
   module TOP ;
     uvm_test top;
     string testname;
     initial begin
       if (!$value$plusargs("MY_TESTNAME=%s",testname)) `uvm_fatal("", "No test specified")
       case(testname)
         "int_10": top = my_test #(int,10)::type_id::create("my_test_int_10",null);
         "int_20": top = my_test #(int,20)::type_id::create("my_test_int_20",null);
         default: `uvm_fatal("", "Test not found")
       endcase
       run_test(""); 
     end
   endmodule
   ```

2. Yes, tools are inconstant in support of $sformat as a parameterization.

3. There are no existing helper macros. You could copy the functionality of

    `uvm_component_utils

   into another macro that takes two arguments; the first being the same argument to uvm_component_param_utils, and the second one being a unique string parameter. That's a small amount of code, but I don't have the time to explain the internals of that macro. Another approach that has the same effect is extending each class specialization into an unparameterized class.

   ```verilog
   class my_test_int_10 extends my_test#(int,10);
   `uvm_component_utils(my_test_int_10)
   function new(string name, uvm_component parent);
     super.new(name,parent);
   endfunction
   endclass
   class my_test_int_20 extends my_test#(int,20);
   `uvm_component_utils(my_test_int_20)
   function new(string name, uvm_component parent);
     super.new(name,parent);
   endfunction
   endclass
   ```

   That would be easy to turn into a macro

   ```verilog
   `define my_test_spec(T,V) \
   class my_test_``T``_V extends my_test#(T,V); \
   `uvm_component_utils(my_test_``T``_V) \
   function new(string name, uvm_component parent); \
     super.new(name,parent); \
   endfunction \
   endclass
    
   `my_test_spec(int,10)
   `my_test_spec(int,20)
   ```

   

4. The answer to 3) lets you use +UVM_TESTNAME

5. No. The replaced string would be the same for each class specialization.