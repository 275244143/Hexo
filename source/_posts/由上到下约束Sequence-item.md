---
title: 由上到下约束Sequence item
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-12 15:19:03
---

### 由上到下约束Sequence item

After reading the title, some of you might be asking yourselves "What are constraints from above?". Constraints from above (CFAs) are an *e* term. As Reuven Naveh explains in [this post](http://www.cadence.com/community/blogs/fv/archive/2009/03/24/generation-action-constraints-from-above.aspx) on Team Specman's blog, CFAs have the following properties:

- *They constrain a do-not-generate field or its descendants.*
- *The constraint is declared not in the type in which the field is declared, but at a higher level.*
- *The field is later generated on-the-fly.*

For those of you who opened the link, they look remarkably similar to in-line constraints, but in modern *e* CFAs are more complicated than what that article presents. We won't go into that as this is a *SystemVerilog* post.

Why are CFAs useful? To best answer that question, let's look at an example. Let's say we have a trivial sequence item that models accessing a communication device:

```verilog
typedef enum { CONFIG, TX_SHORT, TX_LONG, RX_SHORT, RX_LONG, SHUTDOWN } mode_e;

class some_item extends uvm_sequence_item;
  `uvm_object_utils(some_item)
  
  rand mode_e mode;
  
  function new(string name = "some_item");
    super.new(name);
  endfunction // new

endclass // some_item
```

We also have some sequence that operates with these items:

```verilog
class some_sequence extends uvm_sequence #(some_item);
  `uvm_object_utils(some_sequence)
  
  rand int unsigned num_items;
  
  constraint max_items_c {
    num_items >= 5;
    num_items <= 10;
  }
  
  function new(string name = "some_sequence");
    super.new(name);
  endfunction // new
  
  task body();
    start_item(req);
    if (!req.randomize() with { mode == CONFIG; })
      `uvm_error("RANDERR", "Randomization error")
    finish_item(req);

    // start num_items comms
    repeat (num_items) begin
      start_item(req);
      if (!req.randomize() with { mode inside { TX_SHORT, TX_LONG, RX_SHORT, RX_LONG }; })
        `uvm_error("RANDERR", "Randomization error")      
      finish_item(req);
    end

    start_item(req);
    if (!req.randomize() with { mode == SHUTDOWN; })
      `uvm_error("RANDERR", "Randomization error")
    finish_item(req);
  endtask // body
  
endclass // some_sequence
```

We need to send an initial configuration command to set up the device. We follow up with the main test, throwing a few communication commands at the DUT and end it all with a shutdown. Pretty easy stuff up to now. Next, what if we want to have another sequence that restricts our traffic to only short communication commands? This already hints at class inheritance because a short communication sequence is just a specialization of our current sequence.

What disturbs us is the inline constraint on *req*, because we hardcoded the values that we want our communication commands to take. The most naïve and inefficient approach would be to just re-implement the *body()* task. In this case it's not a big deal, because we don't do much aside from running our traffic, right? Aside from the traffic loop which we need to slightly change, It's just two little 4-line blocks we need to copy. But what happens if a new command gets added and we have to run that as well prior to starting our traffic? We would have a second place we have to patch. Not good.

What we could also do is spin-off our traffic loop to it's own method and override that. This could work, but it's so C++. The little *e*angel on my shoulder is telling me: "This would be a great time to use a constraint from above.".

Instead of hardcoding the constraint inside the *with* block, we can put a constraint on *req* in *some_sequence*'s scope:

```verilog
class some_sequence extends uvm_sequence #(some_item);
  // ...
  rand some_item req;
    
  constraint only_comms_c {
    req.mode inside { TX_SHORT, TX_LONG, RX_SHORT, RX_LONG };
  };
  
  // ...
endclass // some_sequence
```

Now, we don't want to randomize the whole sequence, because that would mess up the *num_items* field. Fortunately, *SystemVerilog* provides an easy way to randomize just a subset of an object's fields. The mechanism is called **in-line random variable control**. Here it is in action, randomizing just the *req* field:

```verilog
class some_sequence extends uvm_sequence #(some_item);
  // ...
  
  task body();
    // ...

    // start num_items comms
    repeat (num_items) begin
      start_item(req);
      if (!this.randomize(req))
        `uvm_error("RANDERR", "Randomization error")
      req.set_item_context(this, get_sequencer);      
      finish_item(req);
    end
    
    // ...
  endtask // body
  
endclass // some_sequence
```

What is happening here is that we are randomizing inside *some_sequence*'s scope.The solver will take all of the constraints defined in *some_item* together with the one we defined above on *req.mode*, but it will only update *req*. Think of it like disabling randomization for all fields except for *req* via calls to *rand_mode(0)*.

For some reason, the call to *randomize()* allocates a new object, even though the standard explicitly states that "[randomize] does not allocate any class objects" (IEEE Std. 1800-2012). I've noticed this behavior on two different simulators and can't explain it (in a stripped down example this doesn't happen; the object is randomized in-place). This new sequence item doesn't have it's context (parent sequence and sequencer) set, hence the call to *set_item_context(...)*.

If we want to create a sequence that starts only short communication commands sequences, it's enough to extend *some_sequence*and add another constraint saying that *req* should be either *TX_SHORT* or *RX_SHORT*:

```verilog
class some_other_sequence extends some_sequence;
  `uvm_object_utils(some_other_sequence)

  function new(string name = "some_other_sequence");
    super.new(name);
  endfunction // new

  constraint only_short_c {
    req.mode inside { TX_SHORT, RX_SHORT };
  }
  
endclass // some_other_sequence
```

Short and sweet, just like in *e* (well, almost, if it weren't for all of that boilerplate code for factory registration and the trivial constructor).

We got points 2 and 3 of Reuven's quote down, but what about point 1? The cool thing about this approach is that it could also work for non-random fields, with the caveat that the semantics of constraints are slightly different for *e* than for *SystemVerilog*. We could just as well not tag *req* as random, but we would need to take care that it's initial value is legal with respect to the constraints (or we would need to tag the constraints as soft). This is because *SystemVerilog* checks that even constraints on just state variables also hold, whereas (I think) *e* discards them.

We could do crazy stuff like disable the constraint inside the constructor and re-enable it inside *post_randomize()*. This would ensure that when the initial randomization of the whole sequence was executed our CFA doesn't lead to a contradiction. After re-enabling the constraint we could randomize only *req* (also in *post_randomize()*) to protect ourselves from another randomization of the sequence. You know what? Too complicated, forget it. I'll gladly call what we did here a CFAs even though it doesn't apply to a state variable, if it makes things simpler.