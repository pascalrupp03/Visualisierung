# Sketch Process

## Design Process

We used Figma with low-fidelity wireframes and pen-and-paper sketches to maintain a lightweight, iterative approach. Through collaborative discussions about interactivity and user engagement, we developed the following structural framework.

## Views & Navigation

The project consists of **4 main views**, navigated linearly (with the option
to jump back):

1. **Landing / Input View** - The entry point where users provide their age and
   salary before proceeding.
2. **Personal Overview View** - Shows where the user stands relative to others
   of the same age and income bracket across multiple decades.
3. **Cost of Living View** - Breaks down how spending categories (housing, food,
   energy, etc.) have evolved over time and their share of disposable income.
4. **Geographic View** - Visualizes how rent prices have shifted settlement
   patterns across regions.

A **persistent bottom navigation bar** allows users to move freely between
views after completing the input step or just scrolling down the websites with some animations.

For wireframes we also used google sheets. The values do not represent acutal values - we here want to inform you
that these values are completely random generated using math.random() from js and casting to an integer and ajusted
to reach a meaningful format.

## Visualizations per View

| View | Visualization Type | Interactive |
|---|---|---|
| Landing | Input form + animated intro | Yes - required user input |
| Personal Overview | Line chart (salary vs. cost of living over decades), percentile indicator | Yes - year slider |
| Cost of Living | Stacked area / grouped bar chart, % of salary used for living costs | Yes - toggle categories |
| Geographic | Choropleth map (rent price evolution by region) | No - static |

So to sum up in general 3 to 4 elements with user providing information at the beginnen - the salary can be given as a range for example or a single value - we'll have to try both to see what works better.

## Design Rationale

We set up the four-view structure to guide people through the problem in a way that actually feels personal and relevant. The **Landing View** asks for age and salary right at the start—this connects the housing crisis to the user's own situation instead of making it feel abstract. For our target audience of young people actually looking for apartments, this makes a big difference.

The **Personal Overview View** uses a line chart comparing salary over time to living costs, so you can actually *see* the gap growing. A year slider lets people explore without getting overwhelmed—they can see how their situation compares to their parents' time. The **Cost of Living View** breaks down where the money goes (housing, food, energy, etc.), so people understand not just that stuff is expensive, but *why*—mainly because housing takes up so much of the budget. The **Geographic View** gives practical info: which Vienna districts are still actually affordable? This helps both people looking for apartments and journalists/researchers trying to make the case to policymakers.

The navigation bar at the bottom lets people jump between views freely, which balances our storytelling (showing the problem clearly) with letting people explore on their own (if they want to dig deeper). We put interactive elements (sliders, toggles) on views where people actually need to interact, while the map is static so it's less overwhelming. This way, someone in a hurry can get the main story, but researchers or journalists can explore as much as they want.

