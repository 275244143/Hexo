---
title: 如何从regmodel派生多个相同累加名字的寄存器
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-10-21 09:36:40
---

### 如何从regmodel派生多个相同累加名字的寄存器

Quote:

> Hello,
>
> I need to read/write and apply different methods on my register model, however I am unable to get access simultaneously to different registers with the same name.
>
> e.g: In my sequence I need to get the mirrored value of REGx with x = 1 .. 30
>
> and in my regmodel ,each of these registers is instantiated separately, so every time I need to write in or read these registers ,I need to call them one by one .
>
> is there any better way to do this,because it is really inconvenient for large number of registers.
>
> Thanks,

Ans:

You could try to play around with the uvm_re (regular expressions) to get all the registers in your model that match a specific pattern (keep in mind you need to have DPI enabled when compiling the UVM library and UVM regex uses POSIX AFAIK)

For example given the following register and reg model:

```verilog
import uvm_pkg::*;
`include "uvm_macros.svh"
 
class my_reg extends uvm_reg;
 `uvm_object_utils(my_reg)
 
    rand uvm_reg_field f1;
 
    function new (string name = "");
      super.new(name, 8, UVM_NO_COVERAGE);
    endfunction
 
    function void build;                     
      f1 = uvm_reg_field::type_id::create("f1");
      f1.configure(this, 8, 0, "RW", 0, 0, 1, 1, 0);  
    endfunction
endclass
 
 
class my_reg_model extends uvm_reg_block;
    `uvm_object_utils(my_reg_model)
 
    // A register model containing two registers
 
    rand my_reg r0;
    rand my_reg r1;
    rand my_reg r30;
  	rand my_reg rX;
 
    function new (string name = "");
      super.new(name, build_coverage(UVM_NO_COVERAGE));
    endfunction
 
    function void build;
      r0 = my_reg::type_id::create("r0");
      r0.build();
      r0.configure(this);
      r0.add_hdl_path_slice("r0", 0, 8);      // name, offset, bitwidth
 
      r1 = my_reg::type_id::create("r1");
      r1.build();
      r1.configure(this);
      r1.add_hdl_path_slice("r1", 0, 8);      // name, offset, bitwidth
 
      r30 = my_reg::type_id::create("r30");
      r30.build();
      r30.configure(this);
      r30.add_hdl_path_slice("r30", 0, 8);      // name, offset, bitwidth
 
      rX = my_reg::type_id::create("rX");
      rX.build();
      rX.configure(this);
      rX.add_hdl_path_slice("rX", 0, 8);      // name, offset, bitwidth
 
      default_map = create_map("my_map", 0, 3, UVM_LITTLE_ENDIAN); // name, base, nBytes
      default_map.add_reg(r0,  0, "RW");  // reg, offset, access
      default_map.add_reg(r1,  1, "RW");  // reg, offset, access
      default_map.add_reg(r30, 2, "RW");  // reg, offset, access
      default_map.add_reg(rX,  3, "RW");  // reg, offset, access
      lock_model();
    endfunction
endclass
```

You could implement the logic somewhere in your sequence etc

```verilog
module test();
 
  bit match;
  string regex = "r[0-9]+";
  my_reg_model  regmodel;
  uvm_reg reg_list[$];
  uvm_reg reg_list_to_be_written[$];
 
  initial begin
 
 
    regmodel = my_reg_model::type_id::create("regmodel");
    regmodel.build();
    regmodel.print();
    regmodel.get_registers(reg_list);
    foreach(reg_list[i]) begin  
      match = uvm_re_match(regex, reg_list[i].get_name());
      if(!match) begin // zero means match
 
        `uvm_info("TEST", $sformatf("reg = %s found with regex = %s", reg_list[i].get_name(), regex), UVM_LOW)
        reg_list_to_be_written.push_back(reg_list[i]);
      end
    end
    do_stuff(reg_list_to_be_written);
    $finish;
   end
 
   task automatic  do_stuff (ref uvm_reg regs[$]);
    uvm_reg_data_t mirror_value;
    foreach(regs[i]) begin
      mirror_value = regs[i].get_mirrored_value();
      `uvm_info("TEST", $sformatf("reg = %s mirrored value = %0h",  regs[i].get_name(), mirror_value), UVM_LOW)
    end
  endtask
endmodule
```

Which outputs:

```shell
# KERNEL: ---------------------------------------------------
# KERNEL: Name        Type           Size  Value             
# KERNEL: ---------------------------------------------------
# KERNEL: regmodel    my_reg_model   -     @445              
# KERNEL:   r0        my_reg         -     @447              
# KERNEL:     f1      uvm_reg_field  ...    RW r0[7:0]=8'h00 
# KERNEL:   r1        my_reg         -     @451              
# KERNEL:     f1      uvm_reg_field  ...    RW r1[7:0]=8'h00 
# KERNEL:   r30       my_reg         -     @455              
# KERNEL:     f1      uvm_reg_field  ...    RW r30[7:0]=8'h00
# KERNEL:   rX        my_reg         -     @459              
# KERNEL:     f1      uvm_reg_field  ...    RW rX[7:0]=8'h00 
# KERNEL:   my_map    uvm_reg_map    -     @463              
# KERNEL:     endian                 ...   UVM_LITTLE_ENDIAN 
# KERNEL:     r0      my_reg         ...   @447 +'h0         
# KERNEL:     r1      my_reg         ...   @451 +'h1         
# KERNEL:     r30     my_reg         ...   @455 +'h2         
# KERNEL:     rX      my_reg         ...   @459 +'h3         
# KERNEL: ---------------------------------------------------
# KERNEL: UVM_INFO /home/runner/testbench.sv(85) @ 0: reporter [TEST] reg = r0 found with regex = r[0-9]+
# KERNEL: UVM_INFO /home/runner/testbench.sv(85) @ 0: reporter [TEST] reg = r1 found with regex = r[0-9]+
# KERNEL: UVM_INFO /home/runner/testbench.sv(85) @ 0: reporter [TEST] reg = r30 found with regex = r[0-9]+
# KERNEL: UVM_INFO /home/runner/testbench.sv(97) @ 0: reporter [TEST] reg = r0 mirrored value = 0
# KERNEL: UVM_INFO /home/runner/testbench.sv(97) @ 0: reporter [TEST] reg = r1 mirrored value = 0
# KERNEL: UVM_INFO /home/runner/testbench.sv(97) @ 0: reporter [TEST] reg = r30 mirrored value = 0
```

### How to Match Strings in SystemVerilog Using Regular Expressions

Recently, I needed to filter out some instance paths from my UVM testbench hierarchy. I discovered that this can be done using regular expressions and that UVM already has a function called uvm_pkg::uvm_re_match(), which is a DPI-C function that makes use of the [POSIX function regexec()](https://www.gnu.org/software/libc/manual/html_node/Matching-POSIX-Regexps.html) to perform a string match.

The uvm_re_match function will return zero if there is a match and 1 if the regular expression does NOT match.

This function is very easy to use. Here is an example which can be found on [EDAPlayground](https://www.edaplayground.com/x/52Lc):

```verilog
module top;
  import uvm_pkg::*;
  
  bit match;
  string str = "abcdef.ghij[2]";
  string regex;

  initial begin
    // match - returns 0
    regex="abcdef.ghij[[][2-7][]]";
    match = uvm_re_match(regex, str);
    printResult();
   
    //match - returns 0
    regex="abcdef*";
    match = uvm_re_match(regex, str);
	printResult();  
 
    //NO match - return 1
    regex="xyz";
    match = uvm_re_match(regex, str);
    printResult();
  end
  
  function void printResult();
    $display(" MATCH=", match, " when searching for regular expression:", regex, " inside string: ", str);
  endfunction
endmodule
```

OUTPUT:

```she
MATCH=0 when searching for regular expression:abcdef.ghij[[][2-7][]] inside string: abcdef.ghij[2]
MATCH=0 when searching for regular expression:abcdef* inside string: abcdef.ghij[2]
MATCH=1 when searching for regular expression:xyz inside string: abcdef.ghij[2]
```

So I started to use the uvm_pkg::uvm_re_match() function to match my class instances.

While playing with this function, I discovered some non-obvious behavior, which I thought I would share with you.

This is best illustrated using this example on [EDAPlayground](https://www.edaplayground.com/x/62j3):

```ver
module top;
  import uvm_pkg::*;
   
  bit match;
  string str = "abcdef.ghij[2]";
  string regex;
  
  initial begin
 
    //case 1 - NO match
    regex = "abcdef.ghij[2]";
    $display("Case1:", regex);
    match =uvm_re_match(regex, str);
    $display(match);
 
    //case 2 - NO match
    regex = "abcdef.ghij\[2\]";
    $display("Case2:", regex);
    match =uvm_re_match(regex, str);
    $display(match);

    //case 3 - MATCHES
    regex = "abcdef.ghij\\[2\\]";
    $display("Case3:", regex);
    match =uvm_re_match(regex, str);
    $display(match);
   
    //case 4 - MATCHES
    regex = "abcdef.ghij[[]2[]]";
    $display("Case4:", regex);
    match =uvm_re_match(regex, str);
    $display(match);
  end
endmodule
```

OUTPUT:

```shell
Case1:abcdef.ghij[2]
1
Case2:abcdef.ghij[2]
1
Case3:abcdef.ghij\[2\]
0
Case4:abcdef.ghij[[]2[]]
0
```

“Case 1” is clearly a mistake because according to POSIX regex the [2] will try to match the character found between the brackets, which is 2, and no matching is performed for the bracket characters [ and ] themselves. [Here](https://www.regextester.com/) is a great website for testing the behavior of regular expressions on a sample text.

I expected “Case 2” to work because the bracket characters are escaped using \[ and \], but in SystemVerilog it seems that the \ character also needs to be escaped because it is itself the escape character used inside a string (for more details see this [stackoverflow question](https://stackoverflow.com/questions/4070577/how-to-write-escape-character-to-string)). See the output when printing the regex for “Case 2”. I therefore need to escape this escape character with another \ character, as in “Case 3”.

“Case 4” is also a solution because we use the [character set](https://www.regular-expressions.info/charclass.html) from regular expressions. We add the opening and closing brackets inside the character set operator [ ] like this: [[] and []].

### uvm_re_match inside the UVM code

Note that the implementation of uvm_re_match() has two variants:

- The POSIX regular expression (default)
- The glob style

The implementation is chosen based on the DPI mode of the UVM library. DPI mode is selected whenever UVM_NO_DPI is not defined. If DPI mode is used, then the uvm_re_match function will use the POSIX implementation, otherwise it will use the glob style implementation, as can be seen below:

```ver
`ifdef UVM_NO_DPI
  `define UVM_REGEX_NO_DPI
`endif

`ifndef UVM_REGEX_NO_DPI
  import "DPI-C" context function int uvm_re_match(string re, string str);
  import "DPI-C" context function void uvm_dump_re_cache();
  import "DPI-C" context function string uvm_glob_to_re(string glob);
`else
  // The Verilog only version does not match regular expressions,
  // it only does glob style matching.
  function int uvm_re_match(string re, string str);
    //...code
  endfunction

  function void uvm_dump_re_cache();
  endfunction

  function string uvm_glob_to_re(string glob);
    // code
  endfunction

`endif
```

If your code defines UVM_NO_DPI or UVM_REGEX_NO_DPI, then the uvm_re_match function will not be able to process POSIX regular expressions and the regular expressions will not work as expected.

### Conclusion

When using the escape character \ in a SystemVerilog string, don’t forget to check whether you need to escape it once more like this \\. Otherwise, it might not do what you expect it to do.

Have you always done this? Please share your experience of using regular expressions in SystemVerilog.

