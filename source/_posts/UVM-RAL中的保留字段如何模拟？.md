---
title: UVM RAL中的保留字段如何模拟？
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-11 17:32:18
password: 2101131
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### UVM RAL中的保留字段如何模拟？

A seemingly simple question that comes up every now and then is "How do I properly handle reserved fields in UVM RAL?". The answer seems straightforward, right? You just don't model them. This is what the UVM guys tell you. While this does work in most cases, sometimes things aren't so simple. This may have been the intention of how it's supposed to work, but this is not what made it into the BCL implementation.

Let's take a step back and first look at what reserved fields are. They are usually empty bit locations in a register, where no "real" field is defined. Typically there are no storage elements behind them. These locations are reserved for future use, for example adding new fields in a register for a new version of the product.

But what if we have some register bits that are declared as reserved in the spec, but actually have some storage elements behind them? This is the opposite case from above. In this case some storage elements are implemented, but are not intended to be used anymore. This may be because the feature controlled by those bits is supposed to be phased out (but the RTL was not yet modified) or it is just plain hidden.

As luck would have it a colleague of mine had this situation about a month back. He was writing some random values to a register that included reserved bits, but when he was reading them back he didn't get 0s at those positions. When asked how he should handle this, I gave him the naïve answer from the beginning of the post: "Just don't model them and they won't be checked.". We tried this, but this isn't what happened.

I've distilled a little example for this case. Here is a simple register with two fields and a gap between them:

```verilog
class example_reg_type extends uvm_reg;
  `uvm_object_utils(example_reg_type)
  
  rand uvm_reg_field field1;
  rand uvm_reg_field field2;
  
  function new(string name = "example_reg_type");
    super.new(name, 32, UVM_NO_COVERAGE);
  endfunction
  
  virtual function void build();
    field1 = uvm_reg_field::type_id::create("field1");
    field2 = uvm_reg_field::type_id::create("field2");
    
    field1.configure(this,  8, 24, "RW", 0, 0, 1, 1, 0);
    // there is a gap of 16 bits in between
    field2.configure(this,  8,  0, "RW", 0, 0, 1, 1, 0);
  endfunction
endclass
```

Using a test harness (the details of which I will spare you in this post), we can emulate bus accesses to this register. Let's do a little sanity check to see how errors are handled in the register model. We write all ones to the register, but when reading it back, let's say that the DUT has a bug in it and it didn't update the value of *field1*:

```verilog
class example_reg_test extends uvm_test;
  // ...
  
  task run_phase(uvm_phase phase);
    example_reg_item item = new("item");
    
    // write all ones
    item.write = 1;
    item.data = '1;
    aport.write(item);
    $display("register value: %h", example_reg_block.example_reg.get());
    
    // read the register
    // - the DUT didn't update field1
    item.write = 0;
    item.data = 'hff;
    aport.write(item);
  endtask
  
endclass
```

In this case, the error message will look like this:

```verilog
[RegModel] Register "example_reg_block.example_reg" value read from DUT (0x00000000000000ff) does not match mirrored value (0x00000000ff0000ff)
[RegModel] Field field1 (example_reg_block.example_reg[31:24]) mismatch read=8'h0 mirrored=8'hff
```

We can clearly see from the error message that our shadow register's *field1* is out of sync with the one inside the DUT.

Now let's model the situation where our reserved bits are not so reserved. After writing all ones to the register, let's say that the DUT actually had some flip-flops for the bits between the two fields and that these were updated. Remember, we didn't model any field between bits 23 to 8 and because of this we aren't expecting the register model to care what happens at these locations. Here is the code for this:

```verilog
class example_reg_test extends uvm_test;
  // ...
  
  task run_phase(uvm_phase phase);
    // ...
    
    // read the register
    // - the DUT delivers 1s for the reserved bits
    item.write = 0;
    item.data = 'hff_ffff;
    aport.write(item);
  endtask
  
endclass
```

I guess you already figured out that I did this little exercise to show you something goes wrong in this situation. The error message we get in this case is:

```verilog
[RegModel] Register "example_reg_block.example_reg" value read from DUT (0x0000000000ffffff) does not match mirrored value (0x00000000000000ff)
```

There is no mention of what field has a different value. But how come? I thought that any "fields" left un-modeled won't get checked. We'll this isn't really true. If we look at the UVM source code (lines 2875 to 2885 of *uvm_reg.svh* in case you're interested) we see that any locations not containing fields do not get masked off. This means the value we receive from the DUT is compared with the 0s inside the shadow register. Coming back to the discussion at the start of the post, handling "don't care" locations like this (leaving them un-modeled) may have been the intention of the UVM developers, but this isn't what is implemented. There's even a Mantis entry for this issue (<http://www.eda.org/mantis/view.php?id=4806>), though I don't know what the status of this is since it's still marked as TBD. A thing like this could have been easily found by a unit test, but that's a different story...

It seems like what we need to do is disable the comparison for the specific locations. UVM RAL doesn't have a register compare mask per se as in vr_ad. Compare masks are set on a per field basis . This means we need to define a dummy field at the problematic location. The access policy for it is irrelevant seeing as how we don't care about its value. What is key here is setting it as volatile.

```verilog
class example_reg_type extends uvm_reg;
  `uvm_object_utils(example_reg_type)
  
  rand uvm_reg_field field1;
  rand uvm_reg_field rsvd;
  rand uvm_reg_field field2;
  
  function new(string name = "example_reg_type");
    super.new(name, 32, UVM_NO_COVERAGE);
  endfunction
  
  virtual function void build();
    field1 = uvm_reg_field::type_id::create("field1");
    rsvd   = uvm_reg_field::type_id::create("rsvd");
    field2 = uvm_reg_field::type_id::create("field2");
    
    field1.configure(this,  8, 24, "RW", 0, 0, 1, 1, 0);
    rsvd  .configure(this, 16, 8,  "RW", 1, 0, 1, 1, 0);
    field2.configure(this,  8,  0, "RW", 0, 0, 1, 1, 0);
  endfunction
endclass
```

When testing it we'll see that the error message goes away. Success!

Now we're fully equipped with how to handle problematic reserved fields in UVM RAL. Read-only locations without any flip-flops can be left un-modeled, but reserved fields with storage elements behind them must be modeled as volatile fields to disable checking. 

- The volatile flag is meant to indicate that the field can be changed internally by the device (like when it has a status bit). Setting it to volatile turns off the checking because determining the "correct" value would be problematic by the register model. So even though setting the volatile bit gets you what you want, it may misdirect the casual reader into thinking that the value could or should change by itself. Typically reserved fields are modeled as "RO", with a reset value of 0. Would it be more clear and self-documenting to model your special reserved field as a simple "RW" since that more closely matches the actual behavior of the register?
- You do raise an interesting point, one I didn't think about. A number of variations are possible here, but it also depends on the field's behavior. It might be the case that the reserved bit is a status field and in that case you do need it to be volatile.What would be nice is to have a one size fits all solution. Maybe the best thing here is to explicitly set it to UVM_NO_CHECK with an extra call to set_check(....), which might make the intent clearer, or?  
- The reason I say a one size solution would be nice is because register models are typically generated out of the specification by some script/tool and it would make the tool more complicated if it had to juggle variations on how to handle some reserved bits differently from others. This is basically why I would have liked it if non-modeled locations in a register are by default treated as "don't care" and I hope this will make it into the BCL implementation eventually.
- Typically locations that aren't implemented should always return 0's - as if they are reserved. I think the default sequences may be doing the right thing by checking for it. You do have an interesting case that doesn't quite fit inside the box - a reserved field that is writable. I wonder if a more appropriate name for it would be a "temp" field. But regardless, you could make a case that you found a "bug" in the RTL, that is, the designer specified that the field is reserved, but it doesn't act like one. This could cause confusion by the end users of your device. I would push back on the designer and ask him to "fix" it or change the documentation.
- I found a statement in the UVM user guide: "Reserved fields should be left unmodelled [sic] (where they will be assumed to be RO fields filled with 0’s), modelled [sic] using an access policy that corresponds to their actual hardware behavior or not be compared using uvm_reg_field::set_compare(0).". I guess I kind of put my foot in my mouth with this post. Regardless, the Mantis item still exists and is marked as urgent, so there doesn't seem to be any consensus within Accellera as to how this is supposed to work.