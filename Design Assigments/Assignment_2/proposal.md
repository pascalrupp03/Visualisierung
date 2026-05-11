## Part 1: Project Proposal

### Topic: "Can Young People Still Afford to Live in Austrian Cities (e.g. for studying, moving out, etc.)?"

This is honestly a problem that affects a lot of people our age. Rents in Vienna and other Austrian cities have gone up like crazy over the past decade, especially after COVID, while people's salaries haven't really caught up. It's basically impossible to buy property without a huge loan and a really stable job—which is hard enough to find these days. Even renting feels impossible for students or people just starting out. We wanted to visualize this problem and show how much harder it's gotten to afford a place to live over time.

### The Data we are Using

We're using data from official Austrian government sources:

- **Rental prices by district** from [wien.gv.at](https://www.wien.gv.at/statistik/gebaeude-wohnungen) - we can see which areas in Vienna are most expensive
- **Housing costs across Austria** from [statistik.at](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/wohnen/wohnkosten) - to compare Vienna to other Austrian cities
- **Income and wage data** from [Statistics Austria](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/einkommen-und-soziale-lage/allgemeiner-einkommensbericht) - to see if young people's salaries actually match what they pay for rent
- **Inflation data (CPI/HVPI)** from [Statistics Austria](https://www.statistik.at/statistiken/volkswirtschaft-und-oeffentliche-finanzen/preise-und-preisindizes/verbraucherpreisindex-vpi/hvpi) and [STATCUBE (2015-2025)](https://statcube.at/statistik.at/ext/statcube/openinfopage?tableId=VPI_2015COICOP18_T01_devpi15c18) - so we can adjust everything for inflation and see real values over time, not just the raw numbers
- **Population and student demographics** from [Statistics Austria](https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung) - to understand how demand is driving prices up

All of this data is publicly available and gets updated regularly, so it's reliable for our project.

### Who's This For?

Our main audience is obviously young people (18–35) who are actually dealing with this—students, early-career workers, basically anyone trying to find a place to live in Austria, especially Vienna.

But we also think journalists and people researching housing policy would find this useful to show other people what's really happening. So the visualization has to work for both groups: it should be easy to understand for regular people, but detailed enough that researchers can dig deeper. We're planning interactive features with filters and a timeline so people can explore the data themselves.

### The Story We Want to Tell

The basic question is: can young people actually afford to live in Austria? We want to tell the story in stages:

1. **First, show how bad it is** - a time-series of rent vs. income over like 10–15 years so people see the gap growing
2. **Then show where it's worst** - a map of Vienna showing which districts are most expensive (looking at rent-to-income ratio)
3. **Then focus on who's most affected** - students and entry-level workers, comparing their salary to what they actually pay for rent
4. **Finally, what's the context?** - talk about why this is happening and what could change it

The cool thing is our data lets us tell both the big story (affordability across Austria over time) and the local story (which Vienna districts are actually livable). We think interactive exploration is perfect for this—people can see the overview but also dig into specific years, cities, and neighborhoods.

### The Main Question
How has it gotten harder or easier for young people (18–35) to afford rent in Austrian cities over the past decade? Which groups are hit the hardest? Our data lets us compare rent to income (adjusted for inflation) across different years and places. So we can show where the gap is growing fastest, which Vienna neighborhoods young renters can still afford, and whether students or entry-level workers are getting hit worse. The visualization will tell a clear story about the problem but also let people explore the data themselves—looking at specific years, cities, and districts.