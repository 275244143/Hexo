---
title: Coverage的可扩展性设计
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-17 13:38:34
password: 2101133
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### Coverage的可扩展性设计

#### 静态扩展性

The biggest advantage of *e* regarding coverage is, in my opinion, the ability to tweak the definitions of existing coverage groups by extending them from anywhere inside the verification environment. This is particularly useful when dealing with coverage groups defined inside eVCs. For example, let's say that we have an AHB eVC that provides some very extensive coverage definitions to make sure that we rigorously verify our DUT. If that DUT is a very simple slave that can only process read transactions, we'll never reach 100% coverage unless we ignore all references to write transactions. This is easily done with just a few lines of code:

```
<'
extend has_coverage vgm_ahb_monitor {
  cover access is also {
    item direction using also ignore = (direction == WRITE);
  };
};
'>
```

While *SystemVerilog* provides a comparably expressive coverage description syntax to *e*'s (which, may be even more powerful in some respects), it doesn't allow for the same extendibility.

Let's say that we are verifying a RISC CPU that can perform simple arithmetic operations using a register file of size 8:

```verilog
typedef enum { ADD, SUB, MUL, DIV } operation_e;
typedef enum { R[8] } register_e;
```

An instruction would contain fields for the operation to be performed, the registers where the two operands are stored and the register in which to store the result:

```verilog
class instruction;
  rand operation_e operation;
  rand register_e op1;
  rand register_e op2;
  rand register_e dest;
endclass
```

At first glance, we might be tempted to try and cover all possible combinations of operations and registers:

```verilog
class cov_collector;
  covergroup cg;
    coverpoint operation;
    coverpoint op1;
    coverpoint op2;
    coverpoint dest;

    cross operation, op1, op2, dest;
  endgroup

  // ...
endclass
```

Even for such a basic CPU this means covering *4 \* 8 \* 8 \* 8 = 2048* cross bins. Adding just one more instruction would raise that number to 2560. Adding just one more register would raise that number to 2916. Adding just two more registers would raise that number to 4000. I guess it's clear that this approach won't scale when our design grows.

Maybe it isn't necessary to cover all combinations. After all, we've had to give up on the dream of traversing the entire state space of a DUT many years ago, when they started getting way too big. We could make an educated guess that it isn't important to make sure that we executed an *ADD* with all combinations of operands and destinations. What would be important, though, is that we've made sure that each register can be multiplexed to each of the three operation arguments:

```verilog
class cov_collector;
  covergroup cg;
    // ...

    operation_vs_op1 : cross operation, op1;
    operation_vs_op2 : cross operation, op2;
    operation_vs_dest : cross operation, dest;
  endgroup
endclass
```

Some other interesting corner cases might be to make sure that we've tried to use the same register for both operands or for one of the operands and the destination, regardless of what the operation was:

```verilog
class cov_collector;
  covergroup cg with function sample(operation_e operation, register_e op1,
    register_e op2, register_e dest
  );
    // ...

    same_reg_both_ops : coverpoint (op1 == op2);
    same_reg_op1_and_dest : coverpoint (op1 == dest);
    same_reg_op2_and_dest : coverpoint (op2 == dest);
    same_reg_both_ops_and_dest : coverpoint (op1 == dest && op2 == dest);
  endgroup
endclass
```

Now that we've cut down the problem space to a more manageable size and are merrily going about verifying our design, our colleagues in marketing notice that there might be some profit to be made if we could offer a version of our CPU that only supports addition and subtraction. Since *SystemVerilog* coverage groups aren't extendable we can't leverage the coverage definitions from above for this other project. We'd need to define the **covergroup** again and specify that we want to ignore multiplications and divisions:

```verilog
class no_mul_cov_collector;
  covergroup cg;
    coverpoint operation {
      ignore_bins ignore[] = { MUL, DIV };
    }

    coverpoint op1;
    coverpoint op2;
    coverpoint dest;

    operation_vs_op1 : cross operation, op1;
    operation_vs_op2 : cross operation, op2;
    operation_vs_dest : cross operation, dest;

    same_reg_both_ops : coverpoint (op1 == op2);
    same_reg_op1_and_dest : coverpoint (op1 == dest);
    same_reg_op2_and_dest : coverpoint (op2 == dest);
    same_reg_both_ops_and_dest : coverpoint (op1 == dest && op2 == dest);
  endgroup

  // ...
endclass
```

Those same colleagues from marketing also figure out that we could sell a slightly slower variant of our CPU that only has four registers. As before, we'd need to create another copy of the **covergroup** where we ignore all registers from *R4* onward:

```verilog
class less_regs_cov_collector;
  covergroup cg;
    coverpoint operation;

    coverpoint op1 {
      ignore_bins ignore[] = { [R4:R7] };
    }

    coverpoint op2 {
      ignore_bins ignore[] = { [R4:R7] };
    }

    coverpoint dest {
      ignore_bins ignore[] = { [R4:R7] };
    }

    operation_vs_op1 : cross operation, op1;
    operation_vs_op2 : cross operation, op2;
    operation_vs_dest : cross operation, dest;

    same_reg_both_ops : coverpoint (op1 == op2);
    same_reg_op1_and_dest : coverpoint (op1 == dest);
    same_reg_op2_and_dest : coverpoint (op2 == dest);
    same_reg_both_ops_and_dest : coverpoint (op1 == dest && op2 == dest);
  endgroup

  // ...
endclass
```

Now we've got three copies of essentially the same **covergroup**, with very small differences. If after a review we notice that we need to add a new coverage item because we missed some important aspect, we'll need to make sure that we update all three of those coverage groups. If marketing finds even more potential for stripped down CPUs (for example, without multiplication and with less registers at the same time), those new variants will only increase the number of files we need to maintain in sync.

I couldn't accept that there isn't any elegant solution to this problem, so I went digging through the LRM. The new 2012 standard added some cool new features to the coverage chapter. The one that caught my eye in particular was the **with** syntax for specifying coverpoints:

```verilog
covergroup some_covergroup;
  coverpoint some_coverpoint {
    ignore_bins ignore[] = some_coverpoint with (is_ignore_bin(item));
  }
endgroup
```

What this code snippet would do is ignore all values of the **coverpoint** for which the *is_ignore_bin(...)* function returns a 1. Let's imagine that we write the definition of the *operation* **coverpoint** in this manner. We need to find a way to switch out the implementation of the function, so that it always returns a 0 (in the general case where we don't want to ignore anything) or sometimes returns a 1 (to ignore *MUL*s and *DIV*s).

There is a lot of literature on this topic (switching out method implementations) in the world of software programming. Generic programming and, more specifically, [policy-based design](https://en.wikipedia.org/wiki/Policy-based_design) give us the answer. This programming paradigm is based on *C++*templates, which are analogous to *SystemVerilog* parameterized classes. We could use parameter classes to define different policies whether a bin is supposed to be ignored or not.

```verilog
class cov_collector #(type POLICY);
  covergroup cg;
    coverpoint operation {
      ignore_bins ignore[] = operation with (
        POLICY::is_operation_ignore_bin(item));
    }

    // ...
  endgroup

  // ...
endclass
```

A policy class would need to provide an appropriate implementation of the *is_operation_ignore_bin(...)* function, for example to ignore multiplication and division:

```verilog
class no_mul_cg_ignore_bins_policy extends cg_ignore_bins_policy;
  static function bit is_operation_ignore_bin(operation_e operation);
    return operation inside { MUL, DIV };
  endfunction
endclass
```

When instantiating the coverage collector, we would select what policy to parameterize it with:

```verilog
cov_collector #(no_mul_cg_ignore_bins_policy) no_mul_cov = new();
```

While trying out this code I got a cryptic error message regarding the use of *is_operation_ignore_bin(...)* inside the bin definition. Luckily, I was able to tweak the code to an equivalent form:

```verilog
class cov_collector #(type POLICY);
  covergroup cg;
    coverpoint operation {
      ignore_bins ignore[] = operation with (item inside
        { POLICY::get_operation_ignore_bins() });
    }

    // ...
  endgroup

  // ...
endclass
```

Now, the policy class just has to return a list containing the values we want ignore:

```verilog
typedef operation_e array_of_operation_e[$];

class no_mul_cg_ignore_bins_policy extends cg_ignore_bins_policy;
  static function array_of_operation_e get_operation_ignore_bins();
    return '{ MUL, DIV };
  endfunction
endclass
```

We can extend this idea to the other coverpoints as well, leading to the following definition for the **covergroup**:

```verilog
class cov_collector #(type POLICY = cg_ignore_bins_policy);
  covergroup cg;
    coverpoint operation {
      ignore_bins ignore[] = operation with (item inside
        { POLICY::get_operation_ignore_bins() });
    }

    coverpoint op1 {
      ignore_bins ignore[] = op1 with (item inside
        { POLICY::get_op1_ignore_bins() });
    }

    coverpoint op2 {
      ignore_bins ignore[] = op2 with (item inside
        { POLICY::get_op2_ignore_bins() });
    }

    coverpoint dest {
      ignore_bins ignore[] = dest with (item inside
        { POLICY::get_dest_ignore_bins() });
    }

    operation_vs_op1 : cross operation, op1;
    operation_vs_op2 : cross operation, op2;
    operation_vs_dest : cross operation, dest;

    same_reg_both_ops : coverpoint (op1 == op2);
    same_reg_op1_and_dest : coverpoint (op1 == dest);
    same_reg_op2_and_dest : coverpoint (op2 == dest);
    same_reg_both_ops_and_dest : coverpoint (op1 == dest && op2 == dest);
  endgroup

  // ...
endclass
```

The default policy (for the fully-featured CPU) would be to not ignore anything:

```verilog
class cg_ignore_bins_policy;
  static function array_of_operation_e get_operation_ignore_bins();
    return '{};
  endfunction

  static function array_of_register_e get_op1_ignore_bins();
    return '{};
  endfunction

  static function array_of_register_e get_op2_ignore_bins();
    return '{};
  endfunction

  static function array_of_register_e get_dest_ignore_bins();
    return '{};
  endfunction
endclass
```

Implementing new variants would just boil down to writing new policy classes. For example, for the CPU with less registers, we would have:

```verilog
class less_regs_cg_ignore_bins_policy extends cg_ignore_bins_policy;
  static function array_of_register_e get_op1_ignore_bins();
    return '{ R4, R5, R6, R7 };
  endfunction

  static function array_of_register_e get_op2_ignore_bins();
    return get_op1_ignore_bins();
  endfunction

  static function array_of_register_e get_dest_ignore_bins();
    return get_op1_ignore_bins();
  endfunction
endclass
```

We can also easily handle the CPU with less registers and no multiplier/divider by just writing a few more lines of code:

```verilog
class less_regs_no_mul_cg_ignore_bins_policy extends
  less_regs_cg_ignore_bins_policy;

  static function array_of_operation_e get_operation_ignore_bins();
    return no_mul_cg_ignore_bins_policy::get_operation_ignore_bins();
  endfunction
endclass
```

As we already saw, selecting the appropriate coverage model is done by passing the corresponding policy as a parameter when instantiating the coverage collector:

```verilog
cov_collector cov;
cov_collector #(no_mul_cg_ignore_bins_policy) no_mul_cov;
cov_collector #(less_regs_cg_ignore_bins_policy) less_regs_cov;
cov_collector #(less_regs_no_mul_cg_ignore_bins_policy) less_regs_no_mul_cov;
```

Using policy classes allows us to separate our coverage definitions from their parameterization. The result is that we have less code, which is also much easier to maintain because we did away with the redundancy the old-school method suffered from.

#### 动态扩展性

In the previous post, we looked at how to use policy classes as parameters for a highly configurable coverage collector. This allows us to easily implement different variations of what bins to ignore. If you haven't read that one yet, I'd encourage you to do so before continuing with this post.

Truthfully, using policy classes wasn't the first approach I tried. I had to go down a wrong path and fail before coming to that idea. Let's have a look at how I started out. You may remember the following code snippet showing the use of a function to specify what values are supposed to belong to a certain bin:

```verilog
covergroup some_covergroup;
  coverpoint some_coverpoint {
    ignore_bins ignore[] = some_coverpoint with (is_ignore_bin(item));
  }
endgroup
```

Since I had defined the covergroup for the CPU instructions inside a coverage collector class, it made the most sense to have the ignore bin function definition also part of that class. At the same time, class member function are overridable... What if we defined the ignore expression inside a virtual function? Inside the base class we don't want to ignore anything yet, so the function would be empty. We could then extend this class and override this function to ignore MUL and DIV. The code for the generic coverage collector would look like this:

```verilog
class cov_collector;
  covergroup cg;
    coverpoint operation {
      ignore_bins ignore[] = operation with (is_operation_ignore_bin(item));
    }
  endgroup

  virtual function bit is_operation_ignore_bin(operation_e operation);
    return 0;
  endfunction

  // ...
endclass
```

Unfortunately, this wasn't supported by the simulator. After a bit more fiddling I gave up on trying to use functions with the with syntax, since that didn't seem to be supported. I wasn't about to give up yet. I figured I could pass the list of ignore bins as a constructor parameter to the covergroup. Instead of having a function that tells us whether a certain value should be ignored we could write a function that returns a list of values that should be ignored:

```verilog
class cov_collector;
  covergroup cg(array_of_operation_e operation_ignore_bins);
    coverpoint operation {
      ignore_bins ignore = operation with (item inside operation_ignore_bins);
    }
  endgroup

  virtual function array_of_operation_e get_operation_ignore_bins();
    return '{};
  endfunction

  function new();
    cg = new(get_operation_ignore_bins());
  endfunction
endclass
```

That also gave some cryptic error. If it didn't like passing the list of ignore bins as a constructor argument, maybe it would go for having it as a class member. After some more trial and error, I eventually got it to work by declaring it as a static field:

```verilog
class cov_collector;
  static array_of_operation_e operation_ignore_bins;

  covergroup cg;
    coverpoint operation {
      ignore_bins ignore = operation with (item inside operation_ignore_bins);
    }
  endgroup

  function new();
    operation_ignore_bins = get_operation_ignore_bins();
    cg = new();
  endfunction

  // ...
endclass
```

For some whatever reason this worked, but only if the ignore list was static. Ignoring the fact that it's a hack, now we're back in business! We can declare our coverage collector sub-class that ignores MULs and DIVs:

```verilog
class no_mul_cov_collector extends cov_collector;
  virtual function array_of_operation_e get_operation_ignore_bins();
    return '{ MUL, DIV };
  endfunction
endclass
```

After firing up the simulator GUI and having a look at the generated bins, we'll get a big surprise. We'll see that MUL and DIV are, in fact, not being ignored. What's the reason for this? Well, remember that we defined the get_operation_ignore_bins() function as virtual and that we are calling this function from inside the constructor. It turns out that calling virtual functions from constructors is generally frowned upon inside the programming community, for reasons that I'm not going to list here. What's happening in our case is that the covergroup is being constructed inside the base class's constructor. The version of the bin generation function that's getting called is the one from inside that same class. Conceptually, at that point, the object being constructed is still of type cov_collector, not no_mul_cov_collector. The same behavior is also specified in the C++ standard.

Bonus points go to whoever noticed from the get-go that this whole thing was a bad idea!

In any case, we should ignore calling a class's virtual methods from its constructor altogether. This is because I've seen other simulators that will behave differently from what I've described above. I seem to remember reading that SystemVerilog should work like C++ in this respect, but I couldn't find any reference inside the LRM. If anyone could point out the appropriate section in the comments, that would be great!

I guess we'll have to scratch that idea... Not necessarily. We can still make use of polymorphism, but we just need to take the method that generates the bins out of the coverage collector class and put it into some other class. We'll call this a policy class:

```verilog
class cg_ignore_bins_policy;
  virtual function array_of_operation_e get_operation_ignore_bins();
    return '{};
  endfunction
endclass
```

The coverage collector class would get an instance of this policy class:

```verilog
class cov_collector;
  protected string name;
  static operation_e operation_ignore_bins[];

  function new(string name, cg_ignore_bins_policy policy);
    this.name = name;
    operation_ignore_bins = policy.get_operation_ignore_bins();
  endfunction

  // ...
endclass
```

We can now subclass the ignore bin generation policy as we like and pass different types of objects to the coverage collector. The simulator will take care at run time that the appropriate get_operation_ignore_bins() function gets called. For example, to create a coverage collector that ignores MULs and DIVs we can create a policy that specifies those as ignore bins:

```verilog
class no_mul_cg_ignore_bins_policy extends cg_ignore_bins_policy;
  virtual function array_of_operation_e get_operation_ignore_bins();
    return '{ MUL, DIV };
  endfunction
endclass
```

When instantiating the coverage collector, we pass it an object of the desired policy subclass:

```verilog
no_mul_cg_ignore_bins_policy no_mul_policy = new();
cov_collector no_mul_cov = new("no_mul_cov", no_mul_policy);
```

We can generalize this approach for the other coverpoints as well. Here's how the full covergroup would look like:

```verilog
class cov_collector;
  protected string name;

  static operation_e operation_ignore_bins[];
  static register_e op1_ignore_bins[];
  static register_e op2_ignore_bins[];
  static register_e dest_ignore_bins[];


  covergroup cg() with function sample(operation_e operation, register_e op1,
    register_e op2, register_e dest);

    option.per_instance = 1;
    option.name = name;

    coverpoint operation {
      ignore_bins ignore[] = operation with (item inside
        { operation_ignore_bins });
    }

    coverpoint op1 {
      ignore_bins ignore[] = op1 with (item inside { op1_ignore_bins });
    }

    coverpoint op2 {
      ignore_bins ignore[] = op2 with (item inside { op2_ignore_bins });
    }

    coverpoint dest {
      ignore_bins ignore[] = dest with (item inside { dest_ignore_bins });
    }

    operation_vs_op1 : cross operation, op1;
    operation_vs_op2 : cross operation, op2;
    operation_vs_dest : cross operation, dest;

    same_reg_both_ops : coverpoint (op1 == op2);
    same_reg_op1_and_dest : coverpoint (op1 == dest);
    same_reg_op2_and_dest : coverpoint (op2 == dest);
    same_reg_both_ops_and_dest : coverpoint (op1 == dest && op2 == dest);
  endgroup


  function new(string name, cg_ignore_bins_policy policy);
    this.name = name;
    operation_ignore_bins = policy.get_operation_ignore_bins();
    op1_ignore_bins = policy.get_op1_ignore_bins();
    op2_ignore_bins = policy.get_op2_ignore_bins();
    dest_ignore_bins = policy.get_dest_ignore_bins();
    cg = new();
  endfunction


  function void sample(instruction instr);
    cg.sample(instr.operation, instr.op1, instr.op2, instr.dest);
  endfunction
endclass
```

Using a different policy we can implement the case where we only have four registers:

```verilog
class less_regs_cg_ignore_bins_policy extends cg_ignore_bins_policy;
  virtual function array_of_register_e get_op1_ignore_bins();
    return '{ R4, R5, R6, R7 };
  endfunction

  virtual function array_of_register_e get_op2_ignore_bins();
    return get_op1_ignore_bins();
  endfunction

  virtual function array_of_register_e get_dest_ignore_bins();
    return get_op1_ignore_bins();
  endfunction
endclass
```

It's also very easy to implement the case with less registers and without multiplication:

```verilog
class less_regs_no_mul_cg_ignore_bins_policy extends
  less_regs_cg_ignore_bins_policy;

  virtual function array_of_operation_e get_operation_ignore_bins();
    no_mul_cg_ignore_bins_policy no_mul_policy = new();
    return no_mul_policy.get_operation_ignore_bins();
  endfunction
endclass
```

As we saw above, parameterizing the coverage definitions is done by feeding the coverage collector the appropriate policy:

```verilog
cg_ignore_bins_policy policy = new();
cov_collector cov = new("cov", policy);

no_mul_cg_ignore_bins_policy no_mul_policy = new();
cov_collector no_mul_cov = new("no_mul_cov", no_mul_policy);

less_regs_cg_ignore_bins_policy less_regs_policy = new();
cov_collector less_regs_cov = new("less_regs_cov", less_regs_policy);

less_regs_no_mul_cg_ignore_bins_policy less_regs_no_mul_policy = new();
cov_collector less_regs_no_mul_cov = new("less_regs_no_mul_cov",
  less_regs_no_mul_policy);
```

You may notice that this approach is remarkably similar to the one we used in the previous post. Before, the type of policy that the coverage collector used was specified at compile time, by passing the policy class as a parameter and relying on static methods. Now, the coverage collector has to wait until run time to get the policy via a constructor argument and it makes use of virtual methods and polymorphism. We could describe the former approach as static and the latter as dynamic.

The dynamic approach seems to suffer from worse tool support, though. We've only got it running by employing various hacks. Barring that we could say that the two are, for all intents and purposes, equivalent.

Or are they? Make sure to read the next post where we'll explore how the two styles fare in the context of a UVM environment.

#### Coverage工厂覆盖

In parts one and two of this series we looked at how to use policy classes to implement an extendable coverage model, where ignore bins can be tweaked. The first post looked at how to use these policies as parameters for a parameterizable coverage collector (the so called static flavor), while the second post focused on using them as constructor arguments for the collector (the so called dynamic flavor).

Since SystemVerilog and UVM have become almost synonymous terms, let's look at how these two approaches for implementing coverage extendability interact with UVM features such as the factory.

Typically, coverage collectors are UVM subscribers that are connected to monitors. Let's start as before with the static implementation, that relies on a parameterizable class:

```verilog
class cov_collector #(type POLICY = cg_ignore_bins_policy) extends
  uvm_subscriber #(instruction);

  `uvm_component_param_utils(cov_collector #(POLICY))

  covergroup cg;
  // ...
endclass
```

We need to instantiate this component inside our environment:

```verilog
cov_collector #(cg_ignore_bins_policy) cov;

virtual function void build_phase(uvm_phase phase);
  cov = cov_collector #(cg_ignore_bins_policy)::type_id::create("cov", this);
  // ...
endfunction
```

We had the foresight to create our coverage collector using the factory. Now, when we want to verify the CPU variant without a multiplier, we just need to make sure that we create an instance of the appropriate type by setting a factory override:

```verilog
virtual function void build_phase(uvm_phase phase);
  cov_collector #(cg_ignore_bins_policy)::type_id::set_type_override(
    cov_collector #(no_mul_cg_ignore_bins_policy)::get_type());
  super.build_phase(phase);
endfunction
```

While this code would compile, it will fail at run time. The reason is because even though no_mul_cg_ignore_bins_policy is a sub-class of cg_ignore_bins_policy, this relationship doesn't trickle down through the parameterization of cov_collector. The two different variants of the coverage collector are totally unrelated to each other from an OOP point of view and cannot be swapped for each other.

The classic solution to this problem is to create a common base class from which the parameterizations will inherit:

```verilog
class cov_collector_base extends uvm_subscriber #(instruction);
  `uvm_component_utils(cov_collector_base)

  // ...
endclass


class cov_collector #(type POLICY = cg_ignore_bins_policy) extends
  cov_collector_base;

  `uvm_component_param_utils(cov_collector #(POLICY))

  // ...
endclass
```

When declaring the coverage collector, we need to declare it as an object of type cov_collector_base and immediately set an override on it:

```verilog
cov_collector_base cov;

virtual function void build_phase(uvm_phase phase);
  cov_collector_base::type_id::set_type_override(
    cov_collector #(cg_ignore_bins_policy)::get_type());
  cov = cov_collector_base::type_id::create("cov", this);

  // ...
endfunction
```

For the restricted CPU we can just replace the previous override:

```verilog
virtual function void build_phase(uvm_phase phase);
  cov_collector_base::type_id::set_type_override(
    cov_collector #(no_mul_cg_ignore_bins_policy)::get_type());
  super.build_phase(phase);
endfunction
```

This will work, but it's not terribly elegant in my opinion. We needed to create the extra level of class hierarchy just so we could get the compiler to do our bidding. I'm also not particularly thrilled with directly starting out with a factory override in the base environment.

The dynamic version of the code is much more straightforward. This time we need to make sure we can switch out policy class instances for each other, so we'll need to make them UVM objects:

```verilog
class cg_ignore_bins_policy extends uvm_object;
  `uvm_object_utils(cg_ignore_bins_policy)

  // ...
endclass
```

In the vanilla SystemVerilog example from the previous post we passed an instance of the policy class as the coverage collector's constructor argument. This isn't possible in UVM because a component's constructor has a fixed signature, taking only its name and its parent. However, there isn't anything stopping us from creating a policy object internally:

```verilog
class cov_collector extends uvm_subscriber #(instruction);
  `uvm_component_utils(cov_collector)

  protected cg_ignore_bins_policy policy;

  function new(string name, uvm_component parent);
    super.new(name, parent);
    policy = cg_ignore_bins_policy::type_id::create("policy", this);
    // ...
  endfunction

  // ...
endclass
```

You may have noticed something slightly off about the previous code snippet. Even though policy is a uvm_object at heart, we pass a uvm_component parent to the create(...) call. What that does is create the policy object inside the coverage collector's scope. This makes it possible to override the policy class type using the following instance override:

```verilog
cov_collector no_mul_cov;

virtual function void build_phase(uvm_phase phase);
  cg_ignore_bins_policy::type_id::set_inst_override(
    no_mul_cg_ignore_bins_policy::get_type(), "no_mul_cov.*", this);
  no_mul_cov = cov_collector::type_id::create("no_mul_cov", this);
  // ...
endfunction
```

A type override would have also worked, but this is a nifty little trick to know. The dynamic variant ended up being far shorter than the static one. I also like this one more because it feels closer to the Gang of Four's "favor object composition over class inheritance" principle. The main disadvantage is that, as we saw last time, it might suffer from more simulator limitations.

As always, you can download the code for this and the previous two posts from SourceForge.

I hope this series of posts convinced you that a certain degree of coverage extendability is also possible in SystemVerilog. As with all other things, as opposed to e, this requires pre-planning. Because of the overhead required, this approach might not catch traction for many testbenches, but it is ideal when developing UVCs. There are still some kinks that need ironing: the syntax for coverpoints isn't fully described and simulator support might be limited for now. While this approach currently resembles a dangerous trek through uncharted waters of the LRM, once the seas of SystemVerilog vendor interoperability calm down it's sure to really start to shine.