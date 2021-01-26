---
title: get_response() with UVM RAL
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - RAL
categories:
  - 验证
mathjax: false
date: 2021-01-25 19:14:04
---



### QA

"Response queue overflow, response is dropped"

Got the above error since my driver was calling seq_item_port.item_done(rsp). The error however goes when I change it to seq_item_port.item_done() in the driver.

My UVM RAL sequence doesn't explicitly make a call to get_response(rsp) but the register reads and writes work perfectly. My question is,how does RAL sequence get the response back if we don't call the get_response() explicitly?



### ANS

The RAL is supposed to abstract away the accesses to registers with its API. When you call a register access method, it uses the register adapter class to convert to/from a generic register item to a bus specific sequence_item.

When your driver does a get_next_item(req) call, it then uses the req sequence_item to do a frontdoor register access. When it calls the item_done() method, the sequencer-driver hand-shake completes and the handle to the req sequence_item is used to retrieve the response data. If you call item_done(rsp) you start to push rsp items into a response queue which is not being unloaded by the adapter.

The adapter has a variable called provides_responses - if this was set to 1, then your item_done(rsp) would not result in an error.



### 源码

* uvm_reg_adapter.svh

```verilog 
  // Variable: provides_responses
  //
  // Set this bit in extensions of this class if the bus driver provides
  // separate response items.

  bit provides_responses; 
```

* uvm_reg_map.svh

```verilog 
   if (adapter.provides_responses) begin
        uvm_sequence_item bus_rsp;
        uvm_access_e op;
        // TODO: need to test for right trans type, if not put back in q
        rw.parent.get_base_response(bus_rsp);
        adapter.bus2reg(bus_rsp,rw_access);
   end
   else begin
       adapter.bus2reg(bus_req,rw_access);
   end
```

* testcase

``` verilog
    function void build_phase(uvm_phase phase);
          if(rm == null) begin
              rm = `CREATE_CMP(`RAL_BLK,"rm")
              rm.configure(null,"");
              rm.build();
              rm.lock_model();
              rm.reset();
          end
      endfunction:m_build_phase

      function void connect_phase(uvm_phase phase);
          super.connect_phase(phase);
          if(rm.get_parent() == null) begin
              m_regs_adapter = new("m_regs_adapter");
              m_regs_adapter.provides_responses = 1;
              //m_regs_adapter.supports_byte_enable = 1;
              rm.default_map.set_sequencer(`REG_SQR,m_regs_adapter);
              rm.default_map.set_auto_predict(1);
          end
      endfunction:connect_phase
```

* driver

```verilog
    `uvm_info(CLASSID,$sformatf("You get req:\n%0s",req.sprint()),UVM_MEDIUM);
   
     fork
          m_csr_vif.sentPkt(req);
          m_csr_vif.recvPkt(m_item);
     join
     $cast(m_csr_pkt,m_item);
     req.csr_type = m_csr_pkt.csr_type;
     req.csr_data = m_csr_pkt.csr_data;
     req.csr_addr = m_csr_pkt.csr_addr;
     $cast(rsp,req.clone());
     rsp.set_id_info(req);
     seq_item_port.item_done(rsp);

```
* sequence

```verilog
        csr_pkt csr_req,csr_rsp;
        for(int i=0;i<m_pkt_num;i++) begin
            csr_req = `CREATE_OBJ(csr_pkt,"csr_req")
            csr_rsp = `CREATE_OBJ(csr_pkt,"csr_rsp")
            csr_req.csr_type = m_csr_type;
            if(m_csr_type == csr_pkt::CSR_WR) begin
                csr_req.csr_addr = m_csr_addr;
                csr_req.csr_data = m_csr_data;
            end
            else if(m_csr_type == csr_pkt::CSR_RD) begin
                csr_req.csr_addr = m_csr_addr;
            end
            start_item(csr_req);
            finish_item(csr_req);
            get_response(csr_rsp);
            if(m_csr_type == csr_pkt::CSR_RD) begin
                csr_req.csr_data = csr_rsp.csr_data;
                m_csr_data = csr_req.csr_data;
            end
        end

```

### 如果没有提供respond 的driver和sequence 就没必要写provides_responses = 1