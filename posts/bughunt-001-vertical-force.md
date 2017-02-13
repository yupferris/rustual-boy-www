{{{
  "title": "Compatibility update: 76%!",
  "author": "ferris",
  "category": "bughunt",
  "tags": ["vertical", "force", "sign extend", "elusive"],
  "date": "2-13-2017"
}}}

This is just a tiny update to let you know that the elusive disappearing/reappearing powerups/enemies bug in Vertical Force was _finally_ fixed, bumping up compatibility from 71% to 76%!

After many painful attempts to try and track down this bug, the answer ended up being _very_ simple...

### The bug

This bug had a number of symptoms. The most obvious was that very early in the game, powerups would disappear/reapper:

[![The bug](/post-images/bughunt/vertical-force/before.gif)](/post-images/bughunt/vertical-force/before.gif)

<!--more-->

Expected result:

[![Expected result](/post-images/bughunt/vertical-force/after.gif)](/post-images/bughunt/vertical-force/after.gif)

Other symptoms included disappearing enemies/bosses, including the first boss disappearing and softlocking the game!

### Tracking attempt 1

My first attempt at tracking down this bug started with poking around in the debugger a bit. With some basic printing, I was able to figure out that the disappearing stuff was not only invisible, it was also not in the OBJ list for the display. This meant it was most likely not a video hardware emulation bug, but instead, a program bug, that was causing these OBJ's to not be drawn.

From there, I started digging into the code a bit in the debugger, and doing a little bit of reversing. This was a bit of a painful process, and [after taking some notes](https://gist.github.com/yupferris/f7a11c9bd48a69b1b8ff08719c1e5f9a), I decided there was likely a lot of code here I'd have to sift through, and even then, it may not be obvious what was going wrong. So, I looked for another strategy.

### Tracking attempt 2

I decided to go op-by-op and compare our instruction implementations against the [CPU's architecture manual](http://www.planetvb.com/content/downloads/documents/U10082EJ1V0UM00.pdf). While this led to a few small cleanups/clarifications in the code, it didn't lead to any behavioral changes, and I eventually came up blank.

### Tracking attempt 3

A couple weeks after this, I decided to dig into the FP ops, as I had some uncertainty about their implementations. I ended up [attempting a small fix](https://github.com/emu-rs/rustual-boy/commit/6bdcae816630f8ee79593a4b3fda7904bca620c9) that didn't seem to affect any of the code I was trying to fix, and while it makes sense, I don't have test hw currently to verify, so I just ended up stuffing those changes on a branch to be tested/confirmed at a later date.

Another couple weeks later, I ended up doing another run through these ops, this time against [mednafen](https://mednafen.github.io/)'s source code, to see if I could find anything obvious. I _did_ end up finding something _less_ obvious though...

To show you what this was, let's take a look at mednafen's implementation for the ADD instruction:

```
BEGIN_OP(ADD);
         ADDCLOCK(1);
         uint32 temp = P_REG[arg2] + P_REG[arg1];

         SetFlag(PSW_OV, ((P_REG[arg2]^(~P_REG[arg1]))&(P_REG[arg2]^temp))&0x80000000);
         SetFlag(PSW_CY, temp < P_REG[arg2]);

         SetPREG(arg2, temp);
         SetSZ(P_REG[arg2]);
END_OP();
```

To break this down, the major steps are:

- temp = gpr[reg2] + gpr[reg1]
- calculate and set psw_ov
- calculate and set psw_cy
- gpr[reg2] = temp
- set s and z flags with gpr[reg2]

Simple enough. Compare this to ours (rearranged a bit so the individual parts are in the same order):

```
OPCODE_BITS_ADD_REG => format_i!(|reg1, reg2| {
    let lhs = self.reg_gpr(reg2);
    let rhs = self.reg_gpr(reg1);
    let (res, carry) = lhs.overflowing_add(rhs);

    self.psw_overflow = ((!(lhs ^ rhs) & (rhs ^ res)) & 0x80000000) != 0;
    self.psw_carry = carry;

    self.set_reg_gpr(reg2, res);
    self.set_zero_sign_flags(res);
}),
```

You'll notice it looks almost identical, but there's something _very_ subtle with the last two lines:

```
SetPREG(arg2, temp);
SetSZ(P_REG[arg2]);
```

vs.

```
self.set_reg_gpr(reg2, res);
self.set_zero_sign_flags(res);
```

Do you spot it? While both code assigns the result to the gpr register specified by `reg2`/`arg2`, mednafen then sets some flags based on `P_REG[arg2]`, while we set them based on the result of the operation. Sounds like they'd be the same, right?

Well, there's _one_ case where this would be different - `r0`. `r0` is the first general-purpose register on the v810, and here's the kicker: _its value is **always 0**_. This means that if there was an operation whose target register were `r0` and the result of the operation was non-zero, the result and the flags wouldn't agree!

I was so excited about finally finding a clue that I went ahead and [tried changing all of our op impl's to take this into account](https://github.com/emu-rs/rustual-boy/commit/6bdcae816630f8ee79593a4b3fda7904bca620c9). But (if you read the commit message) you'll notice that unfortunately, it actually made the problem _worse_ - now, when the powerups/enemies disappeared, they didn't come back!

So, I went back to mednafen's source code looking for some answers, and, sure enough, I found an explanation. As it turns out, mednafen's `r0` value is _not always 0_. In fact, the code in these ops was overwriting its value to the operation result before setting the flags! This meant two things: 1. the logic ends up being equivalent to what we had before, and 2. something must be setting `r0`'s value back to 0, or else things would get _really_ weird. After a tiny bit more digging, I found the answer - mednafen actually resets `r0`'s value to 0 before each instruction! I'm not entirely sure why they do this; perhaps it's to avoid checking if the register it's reading from/writing to is register 0, and just does the read/write anyways. But, this meant that the logic in that change was neither correct (or at least it doesn't match mednafen; I'm keeping it on a branch _just in case_ but I don't expect it to be correct in the end), nor particularly relevant to our original bugs after all. Bummer!

### Tracking attempt 4

Finally, I ended up sitting down and going through our CPU code op-by-op, and comparing against _both_ the mame and mednafen source code to see if I could find anything obvious. Just like the second tracking attempt, this resulted in a few small logical clarifications/cleanups, but nothing really major. I checked the usual arithmetic ops first (add, sub, and, or, ..), the jumps/branches, etc.

Then, when looking through mame's mul and mulu op's, I noticed the flags were a bit strange. It seemed like it was setting the flags based on the high 32 bits of the multiplication, rather than the low bit. This seemed a bit odd, so I checked mednafen's source, which unsurprisingly, set the flags based on the low 32 bits as we were doing. So it probably wasn't that, at least.

While I was there, though, I noticed one _very_ small detail in mednafen's code:

```
uint64 temp = (int64)(int32)P_REG[arg1] * (int32)P_REG[arg2];
```

This line of code calculates the signed 64-bit result of the multiplication between the two 32-bit operands. Compare this to our code:

```
let lhs = self.reg_gpr(reg2) as i64;
let rhs = self.reg_gpr(reg1) as i64;
let res = (lhs * rhs) as u64;
```

Spot the difference? If you blink, you'll miss it! The answer is _very_ simple. In our code, all registers are `u32`'s. In order to do a signed multiply with 64 bits precision, we need to cast these `u32`'s to `i64`'s. See it yet? Our code doesn't properly sign extend, it zero extends! This means that even though we're casting to `i64`'s, we're only ever really doing multiplication of two unsigned 32-bit numbers.

### The final fix

The final fix is super simple:

```
let lhs = (self.reg_gpr(reg2) as i32) as i64;
let rhs = (self.reg_gpr(reg1) as i32) as i64;
```

All we had to do all along was cast to signed `i32`'s, then to `i64`'s from there, sign-extending our operands. And that's it!

### Conclusion

So, in the end, this fix was absolutely trivial, but as usual, it took a bit of fiddling and searching to nail down exactly what it was! But, at this point, I'm just happy to have finally found it :)

Happy [![76% compatibility](https://img.shields.io/badge/compatibility-76%25-yellow.svg)](https://github.com/emu-rs/rustual-boy/blob/master/README.md#known-game-compatibility) !