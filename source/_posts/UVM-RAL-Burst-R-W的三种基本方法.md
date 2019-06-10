---
title: UVM-RAL Burst R/W的三种基本方法
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-10 17:44:47
password: 2101144
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### UVM-RAL Burst R/W的三种基本方法

A solution would need to take two factors into account. It would need to pragmatic, i.e. do the job with the least amount of code necessary. If you would have asked me this question a little while back I would have stopped here. In the mean time, I've been toying with the idea of using the register abstraction layer as a means of achieving reuse (both lateral and vertical) of sequences. Most probably you'll be seeing more posts on the topic. The second factor I would thus consider important is portability, i.e. being able to take sequences from one project and use them in another.

As an example, let's take a simple design that has four registers, located at consecutive addresses:

```verilog
class some_reg extends uvm_reg;
  rand uvm_reg_field FIELD0;
  rand uvm_reg_field FIELD1;
  rand uvm_reg_field FIELD2;
  rand uvm_reg_field FIELD3;

  // ...
endclass


class some_reg_block extends uvm_reg_block;
  rand some_reg SOME_REGS[4];

  virtual function void build();
    // ...
    foreach (SOME_REGS[i]) begin
      SOME_REGS[i].build();
      SOME_REGS[i].configure(this);
      default_map.add_reg(SOME_REGS[i], 'h4 * i);
    end
  endfunction

  // ...
endclass
```

## 

When updating a register, we would use the built-in methods of *uvm_reg* to set the desired value and trigger a write:

```verilog
class write_some_reg0 extends sequence_base;
  // ...

  virtual task body();
    uvm_status_e status;
    model.SOME_REGS[0].FIELD0.set('hff);
    model.SOME_REGS[0].update(status);
  endtask
endclass
```

Let's assume that the DUT has an AHB interface that supports burst accesses. This means that it's possible to access all four registers using a single AHB transaction. Converting from register accesses to bus items is usually done using a register adapter:

```verilog
class reg_adapter extends uvm_reg_adapter;
  virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
    burst b = burst::type_id::create("burst");
    if (!b.randomize() with {
      address == rw.addr;
      kind == SINGLE;
      direction == rw.kind == UVM_READ ? READ : WRITE;
      data[0] == rw.data;
    })
      `uvm_fatal("RANDERR", "Randomization error")
    return b;
  endfunction

  // ...
endclass
```

I'll assume everybody is familiar with how an adapter works. If not, the UVM User Guide is a good resource to get you up to speed on how the register model is integrated. This adapter can only handle accessing one register at a time. We need some way of telling it that we actually want to access more registers.

As seen in the links above, people will recommend using the optional *extension* argument of the *read(...)* and *write(...)* tasks to instruct the adapter that the access it's converting is actually a burst to more registers. The use model would be to have a class containing information about whether a register access is a burst:

```verilog
class reg_burst_extension extends uvm_object;
  rand int unsigned num_regs;

  constraint valid_num_regs {
    num_regs inside { 1, 4 };
  }

  // ...
endclass
```

If *num_regs* is 1, then the access is a normal one, otherwise it's a burst. It's also a good idea to make the field of the extension random to allow for more generic sequences. When wanting to write all four registers at a time, we could set the values that we want our registers to take, construct an object of this class, set *num_regs* to 4 and pass it to the *update(...)* task:

```verilog
class write_some_regs extends sequence_base;
  // ...

  virtual task body();
    uvm_status_e status;
    reg_burst_extension ext = reg_burst_extension::type_id::create("ext");
    ext.num_regs = 4;

    model.SOME_REGS[0].FIELD0.set('hff);
    model.SOME_REGS[1].FIELD1.set('hff);
    model.SOME_REGS[2].FIELD2.set('hff);
    model.SOME_REGS[3].FIELD3.set('hff);
    model.SOME_REGS[0].update(status, .extension(ext));
  endtask
endclass
```

The vanilla register adapter doesn't know anything about the extension we passed. We'll need a sub-class that can interpret the extra information and use it to generate a burst. If we don't pass an extension or pass an unsuitable extension, then we can just generate a *SINGLE* AHB transaction as before:

```verilog
class ahb_reg_adapter extends vgm_ahb::reg_adapter;
  function new(string name = "ahb_reg_adapter");
    super.new(name);
  endfunction

  virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
    uvm_reg_item item = get_item();
    reg_burst_extension ext;

    if (item.extension == null || !$cast(ext, item.extension) || ext.num_regs == 1)
      return super.reg2bus(rw);

    // ...
  endfunction
endclass
```

If we do want to do a burst access, then we need to collect the information from all registers and store it inside the AHB transaction that we want to start:

```verilog
class ahb_reg_adapter extends vgm_ahb::reg_adapter;
  // ...

  virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
    vgm_ahb::burst b = vgm_ahb::burst::type_id::create("burst");
    uvm_reg_item item = get_item();
    reg_burst_extension ext;
    uvm_reg regs[];
    uvm_reg_addr_t offset;
    uvm_reg_data_t data[];

    // ...

    offset = regs[0].get_offset(item.map);
    data = new[ext.num_regs];
    for (int i = 1; i < ext.num_regs; i++)
      regs[i] = item.map.get_reg_by_offset(offset + i*4);

    foreach (regs[i])
      data[i] = regs[i].get();

    if (!b.randomize() with {
      address == rw.addr;
      kind == vgm_ahb::INCR4;
      direction == rw.kind == UVM_READ ? vgm_ahb::READ : vgm_ahb::WRITE;
      foreach (data[i])
        data[i] == local::data[i];
    })
      `uvm_fatal("RANDERR", "Randomization error")
    return b;
  endfunction
endclass
```

This is the tried and true way of doing it. It's also pretty easy to implement. The problem with it, though, is that it's rather coupled with the verification environment. Let's assume that we get a second variant of our DUT that is a bit more bare-bones and only has an APB interface. Ideally, we'd want to be able to run the same sequences (or a subset thereof) in this second verification environment. Accessing single registers isn't a problem, as these would be handled by the vanilla APB register adapter (code not shown for brevity). When starting the burst access sequence (the one with the extension), we'd still like to see all four registers getting accessed, albeit via four different APB transfers. This means we'd need to have a register adapter that can start four transactions in one go:

```verilog
class apb_reg_adapter extends vgm_apb::reg_adapter;
  // ...

  virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
    // ...

    foreach (regs[i]) begin
      if (i == 0)
        continue;
      if (rw.kind == UVM_READ)
        fork
          automatic uvm_reg rg = regs[i];
          rg.read(status, data);
        join_none
      else
        fork
          automatic uvm_reg rg = regs[i];
          rg.write(status, rg.get());
        join_none
    end

    return super.reg2bus(rw);
  endfunction
endclass
```

The *reg2bus(...)* method is a function, so it can't block. It can also only return one bus transaction. That would be the one corresponding to the register we called *write(...)* on. If we'd like to access the other three registers as well, one would optimistically think that the other accesses could be forked out. This could get us in a world of trouble with race conditions, because the order in which the accesses would get processed isn't defined. It also doesn't work as expected, because the *update(...)* task returns before all accesses are finished. For writes this might not be such a big issue, but for reads this would be fatal, since we wouldn't be able to rely on the values stored in the registers to be up-to-date. I didn't really investigate how to improve on this, since the whole idea seems silly. A register adapter isn't meant for this kind of operation. It can only start one bus transaction based on one register access, not more. This was all fine and dandy when that transaction could be a burst (as for AHB), but it falls apart when we need to translate sequences that try to access all four registers at once. This means we can't reliably run the sequences that use the extension mechanism in the APB verification environment, at least not while having them go through an adapter. They could still be reused if we employed a different means of translating from register accesses, using a register sequencer layered on the APB sequencer that would run a translation sequence (more on this later).

The main takeaway point, though, is that while using the extension is easy to set up for the initial DUT (the one with AHB), it becomes trickier to port it to any subsequent variants of the design that use different bus protocols, particularly so if the protocols don't intrinsically support burst accesses. Even for other protocols that do support burst accesses (e.g. AXI), we'd still need to create a sub-class of the corresponding register adapter that can extract the information contained in the extension.

The problem stems from the fact that we're trying to shoehorn an unsuitable abstraction. Calls to *uvm_reg::read(...)/write(...)*ultimately end up creating an abstract register access, of type *uvm_reg_item*. Such a register item (which is a sub-class of *uvm_sequence_item*) can model anything from a small access that takes one bus cycle, to a very big access that takes multiple bus cycles (also called a burst). We're trying to model an access to four registers as an access to one of the registers that includes some side information to say if it's actually a burst or not.

A better idea might be to not go the way of using an extension. Instead, we could create a register item "by hand", fill it up with the appropriate information and send it out to be processed:

```verilog
class write_some_regs extends sequence_base;
  // ...

  virtual task body();
    uvm_reg_item item;
    `uvm_create_on(item, model.default_map.get_sequencer());

    model.SOME_REGS[0].FIELD0.set('hff);
    model.SOME_REGS[1].FIELD1.set('hff);
    model.SOME_REGS[2].FIELD2.set('hff);
    model.SOME_REGS[3].FIELD3.set('hff);

    item.kind         = UVM_BURST_WRITE;
    item.offset       = model.SOME_REGS[0].get_offset();
    item.value        = new[4];
    foreach (item.value[i])
      item.value[i] = model.SOME_REGS[i].get();

    `uvm_send(item)
  endtask
endclass
```

Instead of starting a register item indirectly via a call to *uvm_reg::write(...)*, we create one ourselves. We explicitly state that this is a burst access, by setting the *kind* field appropriately. The (misleadingly named) *value* field is actually an array that contains one element per burst transfer. Since we want to write to four registers, we set its size to 4 and its elements to the desired values of the registers.

This is one piece of the puzzle. Now we need to translate this *uvm_reg_item* to the bus transaction that the DUT needs to see. Trying to send this access through a register adapter might work for the AHB DUT, because the AHB adapter can start a single AHB transaction that is capable of representing the entire register item. Trying to send it through the APB adapter will lead to the same problem that we had before before, namely that we can't start multiple APB transactions based on it.

The UVM User Guide show us how to implement a different translation scheme, more sophisticated than the register adapter. As briefly mentioned above, it involves layering. As described in section 5.9.2.3 of the [User Guide (UVM 1.1)], we can have a register sequencer that serves as a landing pad for *uvm_reg_items*. A translation sequence running on the bus sequencer would get items from this register sequencer and could convert them to bus transactions.

For AHB, this is pretty easy to write:

```verilog
class reg_xlate_sequence extends uvm_reg_sequence #(uvm_sequence #(burst));
  // ...

  virtual task do_reg_item(uvm_reg_item rw);
    burst b = burst::type_id::create("burst");

    if (!b.randomize() with {
      if (rw.kind inside { UVM_READ, UVM_BURST_READ })
        direction == READ;
      else
        direction == WRITE;
      address == rw.offset;
      data.size() == rw.value.size();
      foreach (data[i])
        data[i] == rw.value[i];
    })
      `uvm_fatal("RNDERR", "Randomization error")
    `uvm_send(b)
  endtask
endclass
```

Our translation sequence extends the built in *uvm_reg_sequence*, which already provides some facilities to perform translation (albeit based on a register adapter, which is the very thing we're trying to avoid). By overriding the *do_reg_item(...)* task, which gets called for each item that gets started on the register sequencer, we can implement our own scheme that generates one AHB transaction based on the contents of the *uvm_reg_item* to be converted. When creating this sequence, we need to specify the instance of the register sequencer and afterwards start it on the bus sequencer:

```verilog
    vgm_ahb::reg_xlate_sequence reg2ahb_seq =
      vgm_ahb::reg_xlate_sequence::type_id::create("reg2ahb_seq");
    reg2ahb_seq.reg_seqr = reg_sequencer;
    uvm_config_db #(uvm_sequence_base)::set(ahb_agent.sequencer, "run_phase",
      "default_sequence", reg2ahb_seq);
```

For APB, the translation sequence is also pretty straightforward:

```verilog
class reg_xlate_sequence extends uvm_reg_sequence #(uvm_sequence #(transfer));
  // ...

  virtual task do_reg_item(uvm_reg_item rw);
    transfer t = transfer::type_id::create("transfer");

    foreach (rw.value[i]) begin
      if (!t.randomize() with {
        if (rw.kind inside { UVM_READ, UVM_BURST_READ })
          direction == READ;
        else
          direction == WRITE;
        address == rw.offset + 4 * i;
        data == rw.value[i];
      })
        `uvm_fatal("RNDERR", "Randomization error")
      `uvm_send(t)
    end
  endtask
endclass
```

Now you might ask what the advantage is when doing it this way, as opposed to using the *extension* argument. Clearly we could save ourselves the trouble of creating our own *uvm_reg_item* in the register burst sequence (which takes up quite a bit of code, but even that could be encapsulated in a task) and just pass an extension to a call to *write(...)/read(...)* as we did before. The downside to this, though, would be that we would need a translation sequence that can extract the extension, which would create an unnecessary dependency. If we would be more diligent in creating our register item, we could even save ourselves the trouble of having to start a translation sequence for APB. If we'd fill a few more of its fields (like *local_map* and some others), the register package itself could handle splitting a burst into multiple transfers and run each of those through a register adapter. I didn't look too much into this, though... The reason for that is that I see this idea of creating our own *uvm_reg_item* for a register burst as a stepping stone for the next idea.

We could conceptually think of our burst access that covers multiple registers as a memory burst starting at a certain offset (in our case the offset of the first register) that is of a certain size (in our case 4). The *uvm_mem* class provides, aside from the *write(...)*and *read(...)* tasks, the *burst_write(...)* and *burst_read(...)* tasks which trigger bursts. We could shadow the registers with a dummy memory, that we would only use to start bursts. The register package would handle the heavy lifting of creating a *uvm_reg_item* based on our desired access.

Defining such a memory is trivial:

```verilog
class shadow_mem extends uvm_mem;
  function new(string name = "shadow_mem");
    super.new(name, 4, 32);
  endfunction

  // ...
endclass
```

Since our register model is probably generated from a specification, we don't want to touch that code. Instead, we can instantiate the shadow memory inside a sub-class and make sure that we instantiate this class in our verification environment instead of the original one:

```verilog
class ext_reg_block extends regs::some_reg_block;
  shadow_mem SOME_REGS_MEM;

  virtual function void build();
    super.build();

    SOME_REGS_MEM = shadow_mem::type_id::create("SOME_REGS_MEM");
    SOME_REGS_MEM.configure(this);

    default_map.add_mem(SOME_REGS_MEM, SOME_REGS[0].get_offset(default_map));
  endfunction

  // ...
endclass
```

We'll get warnings that the memory and the registers overlap, but these can be silenced.

We could call *burst_write(...)* on this memory with the appropriate arguments to trigger a burst that accesses all four registers. Since we have quite a few arguments to pass, this could get tedious, so we can define a helper task:

```verilog
class shadow_mem extends uvm_mem;
  // ...

  virtual task update_regs(
    output uvm_status_e      status,
    input  uvm_path_e        path   = UVM_DEFAULT_PATH,
    input  uvm_reg_map       map = null,
    input  uvm_sequence_base parent = null,
    input  int               prior = -1,
    input  uvm_object        extension = null,
    input  string            fname = "",
    input  int               lineno = 0
  );
    uvm_reg_data_t values[4];
    ext_reg_block model;

    if (!$cast(model, get_parent()))
      `uvm_fatal("CASTERR", "Cast error")

    foreach (values[i])
      values[i] = model.SOME_REGS[i].get();

    burst_write(status, model.SOME_REGS[0].get_offset(), values, path, map,
      parent, prior, extension, fname, lineno);
  endtask
endclass
```

The *update_regs(...)* task is similar to *burst_write(...)*, but it doesn't require us to pass an offset or the data values to be written. These are computed based on the desired values of the registers that the memory shadows. A similar task could be defined to read all the registers.

Our sequence that does a register burst would look like this:

```verilog
class write_some_regs extends sequence_base;
  // ...

  virtual task body();
    uvm_status_e status;

    model.SOME_REGS[0].FIELD0.set('hff);
    model.SOME_REGS[1].FIELD1.set('hff);
    model.SOME_REGS[2].FIELD2.set('hff);
    model.SOME_REGS[3].FIELD3.set('hff);

    model.SOME_REGS_MEM.update_regs(status);
  endtask
endclass
```

Integrating this sequence is even more straight forward than before. For APB, we don't even need the register sequencer; the register adapter will suffice. For AHB, we could either have a register sequencer layered on the AHB sequencer (as in the previous section) or we could use a custom frontdoor sequence 



I don't consider the third approach, using a shadow memory, to be much more complicated than the first one, where we were using the *extension* argument. Sure it requires a bit more code to declare the shadow memory, especially the convenience tasks, but even that could could be abstracted and made reusable. Layering the shadow memory on bus protocols that don't support bursts is effortless (assuming that a register adapter is already available with the protocol UVC), because UVM_REG already contains a lot of code to handle this. It's only for bus protocols that support burst operation that we need to make sure that register/memory bursts get converted properly. A good UVC for such a protocol will also provide infrastructure for this, in the form of a translation sequence.

When using a custom *extension* argument to implement such register bursts, the translation scheme always has to be tailored to support this, by extending the generic register adapter or translation sequence to extract the information stored in the extension. It's also rather unintuitive that simpler protocols (that don't support burst operation) cause more headaches. Using the *extension* argument in this way might also interfere with other uses for it, where a user needs to pass in other side information (such as protection levels) to be translated.

The decision which scheme to use in a certain verification environment depends on whether portability (due to lateral or vertical reuse) is or isn't important.