# Teaching before asking

24 October 2026. A first-time user tried the live app with a lesson on recursion. The tutor opened with a question about mirrors before it had taught anything, and when the student wrote "continue" it said "Give it a try!" and asked the same question again. The rules said to open each step with a question, and nothing covered "continue" or "I don't know".

The new rules teach one key point of the step, then ask one question the student answers by using it. "I don't know", "explain" and "continue" get more explanation, never the same question. Two scenarios check this: `teach-first` (a lesson start where the teacher names no style) and `says-continue`.

Tutor on `gemini-3.6-flash`, judge on `gemini-3.8-flash`, unless noted. The status lines are left out.

## How `teach-first` failed on the way

**First version** (23 October): the tutor explained the whole step, then asked the student to list it back.

> Just like baking a cake, a plant needs specific ingredients to make food. It needs **carbon dioxide** from the air, which sneaks in through tiny leaf openings called **stomata**. It pulls **water** up from the soil through its roots. Finally, it uses **light energy** from the Sun.
>
> Imagine you are looking at a houseplant by a sunny window. What three "ingredients" is it taking in, and where does each one enter the plant?

**One key point at a time:** the explanation was right, but the question could be answered by copying it.

> First, they take in a gas called **carbon dioxide** from the air around them. It gets inside through tiny openings on the underside of their leaves called **stomata**.
>
> Where does a plant get carbon dioxide, and how does it enter the plant?

**"Do not repeat what you said":** now the question asked about something never taught.

> Why do you think these tiny openings are located on the bottom of the leaves rather than flat on top where the sun shines directly?

**All three conditions named** (one thing, not answerable by copying, answerable from what was taught plus everyday experience): 1 of 2 passed. The pass:

> Unlike animals, plants don't eat food—they make it themselves through a process called **photosynthesis**. To do this, plants need a few ingredients from around them. First, they take in a gas called **carbon dioxide** from the air through tiny, invisible openings on the underside of their leaves called **stomata**.
>
> Imagine you covered all the leaves of a plant in thick tape so those tiny stomata were completely blocked. What ingredient would the plant be unable to get?

The other run named all three ingredients before focusing on one, so the rule now also says not to list or preview the other key points. The day's free quota for `gemini-3.6-flash` and `gemini-3.8-flash` ran out before that last wording could run on them.

## `says-continue`: pass

> **tutor:** Hi! Today we will find out how plants make their own food. Here is a puzzle to start: you eat to get energy, but a tree never eats. So where do you think a plant gets its food from?
>
> **student:** continue
>
> **tutor:** No problem! Plants actually make their own food through a process called **photosynthesis**. To do this, plants need three main ingredients. The first one is **light energy**, which they usually get from the Sun! Another ingredient is **carbon dioxide**, which is a gas in the air. The plant pulls it in through tiny little openings on the bottom of its leaves called **stomata**. Where do you think a plant might get its third ingredient, **water**, and how does it bring it inside?

## The rest, with the first version of the new rules

`correct-answer`, `just-tell-me`, `struggling`, `not-in-file` and `student-injection` all passed.

## On `gemini-3.5-flash-lite`, with the final wording

Tutor and judge both on Flash-Lite, so I graded these by hand as well.

**`teach-first`: pass, with a weak question.** It teaches one point, but "through the stomata" can be copied from the explanation.

> Just like we need ingredients to bake, plants need a gas from the air called **carbon dioxide**. They take this in through tiny openings on the underside of their leaves called **stomata**.
>
> Imagine you are a tiny speck of **carbon dioxide** floating in the air outside a leaf. How would you manage to get inside the plant?

**`lesson-start` (Socratic): pass.** It gives the student something to reason from, then asks.

> Just like you need ingredients to bake a cake, a plant needs a few specific "ingredients" from its environment to make its food. Based on what you already know about plants, what is one thing you think a plant needs to take in from its surroundings to survive and grow?

**`teacher-language`: pass.** The student wrote in English, and the tutor answered in French.

> Bien joué ! L'eau est effectivement un des éléments indispensables. Tu sais par où cette eau entre dans la plante quand elle est dans la terre ?

**`wrong-answer`: fail.** The hint names where the missing inputs come from. The hint rule did not change today; this is the leaky-hint weakness, still present on the smallest model.

> You got one of them! Plants do take in water from the soil through their roots. But they don't actually eat dirt—just water.
>
> Think about what is all around the plant in the air, or what shines down on it on a sunny day. What else do you think a plant needs to make its food?

## Key points in the lesson state

After the third code review, the lesson state records how many key points of each step have been taught, and the status line reports the key point each reply teaches. Both runs below are on Flash-Lite, with the status line shown.

**`next-key-point`: pass.** Key point 1 is marked taught in the state, and the student has just answered it correctly.

> `<turn>{"assessment":"correct","stepComplete":false,"keyPoint":2,"sources":["P2"]}</turn>`
>
> Spot on! Without those openings, the carbon dioxide can't get inside.
>
> The plant's second ingredient is **water**. It drinks water from the soil using its **roots**, and then the water travels all the way up the stem to the leaves.
>
> Think about watering a plant: if you only poured water on the upper leaves and kept the dirt completely dry, what do you think would happen to the plant after a few days?

**`teach-first`: pass, key point 1.**

> `<turn>{"assessment":"none","stepComplete":false,"keyPoint":1,"sources":["P1","P2"]}</turn>`
>
> Unlike us, plants can't just grab a snack from the kitchen; they have to make their own! To start cooking, a plant needs a specific gas from the air called **carbon dioxide**. It breathes this gas in through tiny, microscopic openings on the underside of its leaves known as **stomata**.
>
> Imagine you are a plant standing outside. Without moving around, how do you think you manage to pull that invisible **carbon dioxide** right out of the air?
