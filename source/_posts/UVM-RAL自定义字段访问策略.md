---
title: UVM-RAL自定义字段访问策略
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-11 10:07:31
password: 2101103
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### UVM-RAL自定义字段访问策略

Today we're going to look at how to define a custom field access policy in the UVM register package.

Let's use the same access policy from last time: "writing to the field is allowed, except when trying to write the value *0*; reading from the field is always allowed".

We'll start out by defining our register field class. The *uvm_reg_field* class provides a set of hook methods for developers to use when extending it. You might be tempted to think that we could use the *pre_write()* method in our case, but this will only work if we do implicit prediction (i.e. using calls to *read()* or *write()* inside our sequences). If we want to make it portable for cases when have traffic to our registers coming from other sources (such as legacy VIP or other DUT blocks when doing vertical reuse) we will want it to work for explicit prediction as well. To achieve this we have to extend the *predict()* method.

The *uvm_reg_field* class doesn't provide any *pre-/post-* hooks for the *predict()* method, but we can use callbacks for that. First we define our own callback class:

```verilog
class vgm_wri0_cbs extends uvm_reg_cbs;
  `uvm_object_utils(vgm_wri0_cbs)
  
  function new(string name = "vgm_wri0_cbs");
    super.new(name);
  endfunction
  
  virtual function void post_predict(input uvm_reg_field  fld,
                                     input uvm_reg_data_t previous,
                                     inout uvm_reg_data_t value,
                                     input uvm_predict_e  kind,
                                     input uvm_path_e     path,
                                     input uvm_reg_map    map);
    if (kind == UVM_PREDICT_WRITE && fld.get_access() == "RWI0" && value == 0)
      value = previous;
  endfunction
endclass
```

We also have to declare our own register field class that defines the new *RWI0* policy:

```verilog
class vgm_rwi0_reg_field extends uvm_reg_field;
  `uvm_object_utils(vgm_rwi0_reg_field)
  
  local static bit m_wri0 = define_access("RWI0");
  
  function new(string name = "vgm_rwi0_reg_field");
    super.new(name);
  endfunction  
endclass
```

When declaring new access policies, it's best to use all uppercase characters as *define_access(...)* calls *toupper()* on the string we give it as an input argument and adds that to the table of access policies. What I would have liked to do at this point is create a callback object inside the constructor and add it to the field. This was unfortunately not possible as adding a callback does a call to *get_full_name()* which in turn requires a references to the field's parent register be set up. We have to postpone this step for higher up in the instance tree.

The last thing we need to do is declare the register:

```verilog
class example_reg_type extends uvm_reg;
  `uvm_object_utils(example_reg_type)
  
  rand uvm_reg_field      field1;
  rand vgm_rwi0_reg_field field2;
  
  function new(string name = "example_reg_type");
    super.new(name, 32, UVM_NO_COVERAGE);
  endfunction
  
  virtual function void build();
    field1 = uvm_reg_field::type_id::create("field1");
    field2 = vgm_rwi0_reg_field::type_id::create("field2");
    
    field1.configure(this,  16, 16, "RW",   0, 0, 1, 1, 0);
    field2.configure(this,  16,  0, "RWI0", 0, 0, 1, 1, 0);
    
    // register callback
    // - can't be done in vgm_rwi0_reg_field because it calls get_full_name()
    //   which requires the field's parent
    begin
      vgm_wri0_cbs wri0_cbs = new("wri0_cbs");
      uvm_reg_field_cb::add(field2, wri0_cbs);
    end
  endfunction
endclass
```

We've defined *field2* as being of type *vgm_rwi0_reg_field* and as having the *RWI0* access policy. We've also added a callback to this field to actually implement the access policy.

This is the only way UVM RAL allows us to define custom field access policies and I can't say I'm particularly pleased about it. Using callbacks is slow and it is bloated. We've had to split our code into three sections: the callback class, the register field class and the register class). Had we have had a *post_predict()* hook in *uvm_reg_field* we could have just implemented everything inside our register field class, resulting in less lines of code and better encapsulation. This is definitely something I hope they will improve in a future release.

<u>lets say your register has 64 different fields and if you want to define access policy for the entire register (i.e secure only write access) you'll need 64 uvm_reg_field_cb::add(field_n, custom_cbs); which to me seems to a lot code to be written, do you think/know if there is a different way to setup custom register access policies(for the entire register at once).</u>

Since 'predict()' isn't virtual and there aren't any 'pre/post' predict hooks defined in 'uvm_reg_field', our options are limited.

One solution would be to override 'do_predict()', which is virtual and gets called by 'predict()'. Since it's not mentioned in the standard, I wouldn't recommend doing this.

The only viable option is to use callbacks. Adding the callback on 64 fields doesn't mean we need 64 calls to 'add(...)', since we can loop over all fields of a reg:

```verilog
 uvm_reg_field fields[$];
 some_reg.get_fields(fields);
 foreach (fields[i])`
 	uvm_reg_field_cb::add(fields[i], some_cb_inst);
```

We could also create another convenience class that adds the callback to all fields of a certain reg:

```verilog
class some_reg_cb extends uvm_callbacks #(uvm_reg, some_cb);
	static function void add(uvm_reg rg, some_cb cb);
		uvm_reg_field fields[$];
		some_reg.get_fields(fields);
		foreach (fields[i])
			uvm_reg_field_cb::add(fields[i], some_cb);
	endfunction
endclass
```

This way we don't have to duplicate the looping code every time we want to define another register with the callback on all of its fields:

```verilog
some_reg_cb::add(some_reg0, some_cb_inst);
some_reg_cb::add(some_reg1, some_cb_inst);
some_reg_cb::add(some_reg2, some_cb_inst);  
```

 <u>I have another question that has been causing me a lot of trouble to implement my register model, most of the examples over the web (if not all) describe how to create custom accesses based on fields using post predict which is pasive and gets triggered no matter who triggered the write/read operation (if explicit prediction it is used) this is fine but what about predicting the write value based on physical bus signals send from (APB PPROT for example or AXI PROT) this signals can alter the predicted write value of the register based on its value. I have come across to the usage of the extension field memeber of the uvm_reg_item in the reg2bus function of adapter class to provide any additional information for write/read to the actual VIP/sequencer that is going to execute the bus transaction, but only afects how the transaction is send to the bus</u>

```verilog
virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
	my_bus_info extra_info;
	uvm_reg_item item = get_item();
	$cast(extra_info, item.extension);
	bus_trans.addr = rw.addr;
	bus_trans.data = rw.data;
	bus_trans.master_id = extra_info.master_id;
	return bus_trans;
endfunction: reg2bus
```

I couldn't find any mechanism (callback, method) to predict accurately the model based on signals such as those, even extending the predictor doesnt helped me out since all information about the bus operation is (except for data and addr) is discarded by the predictor when calling adapter.bus2reg(tr,rw)

------

If you just need to ignore writes/reads when a protection level doesn't match, then you can create your own predictor class and override its 'write(...)' function:

```verilog
class my_protected_predictor extends uvm_reg_predictor #(apb_item);
	apb_prot_t allowed_prot;

	virtual function void write(apb_item tr);
		if (apb_item.prot >= allowed_prot)
			write(tr);
	endfunction
endclass
```

This is usually the case. Moreover, wrong protection should also issue a bus error and the predictor shouldn't get triggered in that case. Ideally this would have been done through a 'UVM_NOT_OK' response in the converted 'reg_bus_op', but I think there's a bug in the UVM code so you need a custom predictor for that too:

```verilog
class my_protected_predictor extends uvm_reg_predictor #(apb_item);
	apb_prot_t allowed_prot;

	virtual function void write(apb_item tr);
		if (apb_item.resp == OKAY)
			write(tr);
	endfunction
endclass
```

If depending on the value of the protection signal you can get different read/write values, then it's more complicated. You need to capture the current transaction in some callback somewhere and assign it from the 'write(...)' function of the predictor:

```verilog
class some_callback extends uvm_reg_cbs;
	apb_item trans;

	// do stuff in 'post_predict(...)' based on trans
endclass

class my_protected_predictor extends uvm_reg_predictor #(apb_item);
	some_callback cb;

	virtual function void write(apb_item tr);
		cb.trans = tr;
		write(tr);
	endfunction
endclass
```

The same instance of the CB you need to pass to the registers as well. This way you know what protection you had. It's also guaranteed that the transaction is updated before 'predict(...)' gets called.  