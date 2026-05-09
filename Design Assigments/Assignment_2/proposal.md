## Part 1: Project Proposal

### Topic: "Can Young People Still Afford to Live in Austrian Cities (e.g. for studying, moving out, etc.)?"

Honestly, this is a pretty relatable problem for anyone our age. Rents in Vienna and other Austrian cities have been going crazy over the past decade, speacially after the coivd pandemic, while wages aren't keeping up. Buying property is basically impossible without a long loan and a stable job, which has become even harder to get nowadays, and even renting feels impossible for students or people just starting their careers. We could like to visualize this problem and make a comparasion between different times and see how diffiduclt it has gotten.

### The Data I'm Using

We're using data mostly from official Austrian government's sources:

- **Rental prices by district** from [wien.gv.at](https://www.wien.gv.at/statistik/gebaeude-wohnungen) — so I can see which areas are most expensive in Vienna.
- **Housing costs across Austria** from [statistik.at](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/wohnen/wohnkosten) — to compare Vienna to other cities.
- **Income/wage data** from [Statistics Austria](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/einkommen-und-soziale-lage/allgemeiner-einkommensbericht) — to actually see if young people's salaries match the rent they have to pay.
- **Inflation data (CPI/HVPI)** from [Statistics Austria](https://www.statistik.at/statistiken/volkswirtschaft-und-oeffentliche-finanzen/preise-und-preisindizes/verbraucherpreisindex-vpi/hvpi) — so I can adjust everything for real values over time, not just nominal numbers.
- **Population and student numbers** from Statistics Austria — to understand how much demand is driving prices up.

Everything is publicly available and regularly updated, so it should be reliable for this project.

### Who's This For?

My main audience is obviously young people (like 18–35) who are actually dealing with this. Students, young professionals, anyone looking for a place to live in Austria, specially in Vienna.

But also I think journalists and policy researchers might find it useful if they want to show people what's actually happening with housing. So the visualization needs to work for both: easy to understand for regular people, but detailed enough for people who want to dig deeper and it should be interactive with several filters and option to show the time line clearly.

### The Story I Want to Tell

So the main question is just that: can young people afford to live here? I'm thinking of it like a guided journey through the problem:

1. First: **Show how bad it's gotten** — time-series of rents vs. income over like 10–15 years. People will see that gap growing.
2. Then: **Where is it worst?** — map of Vienna showing which districts are most expensive (rent-to-income ratio)
3. Then: **Who was affected the most?** — focus on students and entry-level workers, show their salary vs. what they'd actually pay for rent
4. Finally: **Is there any way out?** — **Are there any improvements/projects to work against that?**

The cool thing about this data is it lets me tell both stories — the big picture (Austria over time) and the local reality (which districts in Vienna are actually livable). Perfect for an interactive thing where people can explore both angles.

### So what's our question?
Are young people (roughly 18-35) able to afford renting in Austrian cities, and how has that affordability changed over the last decade? The dataset lets us compare rent to income (inflation-adjusted) over time and across places, so we can show where the gap is growing fastest, which Vienna districts are least livable for first-time renters, and how different groups (students vs. entry-level workers) are affected. The visualization should support both a clear story about the widening gap and an exploratory view where people can check specific years, cities, and districts.