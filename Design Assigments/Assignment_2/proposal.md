## Part 1: Project Proposal

### Topic: "Can Young People Still Afford to Live in Austrian Cities?"

Honestly, this is a pretty relatable problem for anyone our age. Rents in Vienna and other Austrian cities have been going crazy over the past decade, while wages aren't keeping up. Buying property is basically impossible, and even renting feels impossible for students or people just starting their careers. I want to visualize this problem and show whether young people can actually afford to live in these cities.

### The Data I'm Using

I found some good public datasets from Austrian government sources:

- **Rental prices by district** from [wien.gv.at](https://www.wien.gv.at/statistik/gebaeude-wohnungen) — so I can see which areas are most expensive in Vienna
- **Housing costs across Austria** from [statistik.at](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/wohnen/wohnkosten) — to compare Vienna to other cities
- **Income/wage data** from [Statistics Austria](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/einkommen-und-soziale-lage/allgemeiner-einkommensbericht) — to actually see if young people's salaries match the rent they have to pay
- **Inflation data (CPI/HVPI)** from [Statistics Austria](https://www.statistik.at/statistiken/volkswirtschaft-und-oeffentliche-finanzen/preise-und-preisindizes/verbraucherpreisindex-vpi/hvpi) — so I can adjust everything for real values over time, not just nominal numbers
- **Population and student numbers** from Statistics Austria — to understand how much demand is driving prices up

Everything is publicly available and regularly updated, so it should be reliable for this project.

### Who's This For?

My main audience is obviously young people (like 18–35) who are actually dealing with this. Students, young professionals, anyone looking for a place to live in Austria. They'll get it because they live it.

But also I think journalists and policy researchers might find it useful if they want to show people what's actually happening with housing. So the visualization needs to work for both: easy to understand for regular people, but detailed enough for people who want to dig deeper.

### The Story I Want to Tell

So the main question is just that: can young people afford to live here? I'm thinking of it like a guided journey through the problem:

1. First: **Show how bad it's gotten** — time-series of rents vs. income over like 10–15 years. People will see that gap growing.
2. Then: **Where is it worst?** — map of Vienna showing which districts are most expensive (rent-to-income ratio)
3. Then: **Who gets hit hardest?** — focus on students and entry-level workers, show their salary vs. what they'd actually pay for rent
4. Finally: **Is there any way out?** — maybe buying a smaller place? Spoiler: probably not realistic for most people

The cool thing about this data is it lets me tell both stories — the big picture (Austria over time) and the local reality (which districts in Vienna are actually livable). Perfect for an interactive thing where people can explore both angles.