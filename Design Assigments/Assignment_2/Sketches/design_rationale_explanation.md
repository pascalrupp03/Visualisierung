# Sketch Process

For our sketches, we used Figma with low-fidelity wireframes/pen and papers to keep the process
lightweight and allow for quick iteration. We had several discussions about
interactivity and settled on the following structure.

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
| Geographic | Heat map (rent price evolution by region) | No - static |