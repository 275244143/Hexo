---
title: Access Policy Change On The Fly
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-23 10:25:49
---

### QA

I am working on register configuration using RAL and have a requirement, where I have change RW register (A) to RO register (A), after a certain event.

### ANS

Once the RAL model is created (build() method) you cannot modify the model, unless you are using IEEE UVM or 1.2 (I'm not sure if 1.2 can call build again), so in this particular case you can use the register field callbacks (most likely the post_predict) to define the desired behaviour of your register based on whatever requirement or event changes it's beahviour

```verilog
class m_reg_field_cbs extends uvm_reg_cbs;
 
    // ------------------------------------------------------
    // UVM automation macros for general components.
    // ------------------------------------------------------
    `uvm_object_utils(m_reg_field_cbs)
 
    bit policy_change;
    uvm_reg rg;
    // ------------------------------------------------------
    // function new()
    //   The constructor of this class.
    // ------------------------------------------------------
    function new(string name = "m_reg_field_cbs");
       super.new(name);
    endfunction
 
    virtual function void post_predict(input uvm_reg_field  fld,
    input uvm_reg_data_t previous,
    inout uvm_reg_data_t value,
    input uvm_predict_e  kind,
    input uvm_path_e     path,
    input uvm_reg_map    map);
 
 
    // Get handle to parent register
    rg             = fld.get_parent();
 
    case (kind)
 
        UVM_PREDICT_READ: begin
           //TODO: put something here if required
        end
 
        UVM_PREDICT_WRITE: begin
            if (rg.get_name() == "RELEVANT_REG_NAME") begin
                if(policy_change) begin
                    value = previous;
                end
            end
        end
 
 
        UVM_PREDICT_DIRECT: begin
           //TODO: put something here if required
        end
     endcase
endfunction
endclass
```

Somewhere probably in the predictor or relevant component in your environment

```verilog
m_reg_field_cbs cb;
 //...
 cb = m_reg_field_cbs ::type_id::create("cb");
 //... based on whatever logic
 cb.policy_change = 1;
```

Somewhere in your environment you connect the callbacks to the relevant register(s)

```verilog
 uvm_reg_fields fields[$];
 reg_model.get_fields(fields);
 
 //connect to the callbacks to the relevant fields or you can make a more complex logic if required
 foreach (all_regs_fields[i]) begin
    uvm_reg_field_cb::add(all_regs_fields[i], cb);
 end
```

